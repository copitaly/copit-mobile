import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AppToastService } from '../../core/services/app-toast.service';
import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { EditProfilePage } from './edit-profile.page';

describe('EditProfilePage', () => {
  let fixture: ComponentFixture<EditProfilePage>;
  let page: EditProfilePage;
  let router: jasmine.SpyObj<Router>;
  let authService: {
    isAuthenticatedSnapshot: boolean;
    accessTokenSnapshot: string | null;
    getCurrentUser: jasmine.Spy;
    updateMemberProfile: jasmine.Spy;
  };
  let appToast: jasmine.SpyObj<AppToastService>;

  const profile: MemberProfile = {
    id: 9,
    email: 'member@example.com',
    first_name: 'Member',
    last_name: 'User',
    role: 'member',
    phone_number: '+39333111222',
    language: 'english',
    date_joined: '2026-07-01T00:00:00Z',
    donation_summary: {
      total_paid_amount: '0.00',
      total_paid_count: 0,
      currency: 'eur',
      last_donation_at: null,
    },
    recent_donations: [],
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EditProfilePage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: AppToastService, useValue: appToast },
        {
          provide: SentryTelemetryService,
          useValue: {
            captureFeatureError: jasmine.createSpy('captureFeatureError'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditProfilePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    authService = {
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(of(profile)),
      updateMemberProfile: jasmine.createSpy('updateMemberProfile').and.returnValue(of(profile)),
    };
    appToast = jasmine.createSpyObj<AppToastService>('AppToastService', ['success', 'error', 'warning', 'info', 'show']);
    appToast.success.and.resolveTo();
  });

  it('loads the profile and patches the form', async () => {
    await createComponent();

    expect(page.form.value.first_name).toBe('Member');
    expect(page.form.value.last_name).toBe('User');
    expect(page.form.value.phone_number).toBe('+39333111222');
  });

  it('shows a retryable load error for generic failures instead of crashing', async () => {
    authService.getCurrentUser.and.returnValue(throwError(() => new Error('network')));

    await createComponent();

    expect(page.loadErrorMessage).toBe('Unable to load your profile right now. Please try again.');
    expect(fixture.nativeElement.textContent).toContain("We couldn't load your profile");
  });

  it('redirects to login on session expiry while loading', async () => {
    authService.getCurrentUser.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );

    await createComponent();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('rejects whitespace-only names before sending an update request', async () => {
    await createComponent();
    page.form.patchValue({
      first_name: '   ',
      last_name: 'User',
      phone_number: '+39333111222',
    });

    await page.save();

    expect(authService.updateMemberProfile).not.toHaveBeenCalled();
    expect(page.form.controls.first_name.invalid).toBeTrue();
  });

  it('trims payload values and refreshes the form after a successful update without redirecting away', async () => {
    authService.updateMemberProfile.and.returnValue(
      of({ ...profile, first_name: 'Maria', last_name: 'Rossi', phone_number: '+39333130099', language: 'italian' })
    );
    authService.getCurrentUser.and.returnValues(of(profile), of({ ...profile, first_name: 'Maria' }));

    await createComponent();
    page.form.patchValue({
      first_name: '  Maria  ',
      last_name: '  Rossi ',
      phone_number: ' +39333130099 ',
      preferred_language: ' italian ',
    });

    await page.save();
    await fixture.whenStable();

    expect(authService.updateMemberProfile).toHaveBeenCalledWith({
      first_name: 'Maria',
      last_name: 'Rossi',
      phone_number: '+39333130099',
      preferred_language: 'italian',
    });
    expect(authService.getCurrentUser.calls.count()).toBe(2);
    expect(page.form.getRawValue()).toEqual({
      first_name: 'Maria',
      last_name: 'Rossi',
      phone_number: '+39333130099',
      preferred_language: 'italian',
    });
    expect(page.form.pristine).toBeTrue();
    expect(appToast.success).toHaveBeenCalledWith('Profile updated successfully.');
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/profile/account-settings', { replaceUrl: true });
  });

  it('prevents duplicate save requests while an update is in flight', async () => {
    const save$ = new Subject<MemberProfile>();
    authService.updateMemberProfile.and.returnValue(save$.asObservable());

    await createComponent();

    page.form.patchValue({
      first_name: 'Member',
      last_name: 'User',
      phone_number: '+39333111222',
    });

    void page.save();
    await page.save();

    expect(authService.updateMemberProfile.calls.count()).toBe(1);
    save$.complete();
  });

  it('keeps entered values and shows a friendly error when save fails', async () => {
    authService.updateMemberProfile.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 400,
        error: { phone_number: ['A user with this phone number already exists.'] },
      }))
    );

    await createComponent();
    page.form.patchValue({
      first_name: 'Member',
      last_name: 'User',
      phone_number: '+39333130099',
    });

    await page.save();

    expect(page.errorMessage).toBe('A user with this phone number already exists.');
    expect(page.form.value.phone_number).toBe('+39333130099');
    expect(page.saving).toBeFalse();
  });
});
