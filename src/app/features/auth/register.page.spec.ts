import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { RegisterPage } from './register.page';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let page: RegisterPage;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  const authResponse = {
    id: 1,
    email: 'kojo@example.com',
    first_name: 'Kojo',
    last_name: 'Mensah',
    role: 'member',
    date_joined: '2026-07-01T00:00:00Z',
    donation_summary: {
      total_paid_amount: '0.00',
      total_paid_count: 0,
      currency: 'eur',
      last_donation_at: null,
    },
    recent_donations: [],
  } as MemberProfile;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['register'],
      {
        isAuthenticatedSnapshot: false,
        accessTokenSnapshot: null,
      }
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    activatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('rejects invalid email formats inline', async () => {
    await createComponent();

    page.form.controls.email.setValue('invalid-email');
    page.form.controls.email.markAsTouched();
    fixture.detectChanges();

    expect(page.showEmailError).toBeTrue();
    expect(page.emailErrorMessage).toBe('Enter a valid email address.');
  });

  it('requires the expected registration fields', async () => {
    await createComponent();

    page.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter your first name.');
    expect(fixture.nativeElement.textContent).toContain('Enter your last name.');
    expect(fixture.nativeElement.textContent).toContain('Enter your email address.');
    expect(fixture.nativeElement.textContent).toContain('Enter a password to continue.');
    expect(fixture.nativeElement.textContent).toContain('Confirm your password.');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('keeps the submit button disabled while registration is running', async () => {
    const response$ = new Subject<any>();
    authService.register.and.returnValue(response$.asObservable());
    await createComponent();

    page.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    page.submit();
    page.submit();

    expect(authService.register.calls.count()).toBe(1);
    expect(page.loading).toBeTrue();
    expect(page.canSubmit).toBeFalse();
    response$.complete();
  });

  it('navigates to the Profile tab after successful registration when a Profile return URL is provided', async () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/tabs/profile' });
    authService.register.and.returnValue(of(authResponse));
    await createComponent();

    page.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    page.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/profile', { replaceUrl: true });
  });

  it('maps duplicate-email responses to a safe user-facing message', async () => {
    authService.register.and.returnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 400,
          error: { email: ['A user with that email already exists.'] },
        })
      )
    );
    await createComponent();

    page.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    page.submit();

    expect(page.errorMessage).toBe('An account already exists for this email.');
  });

  it('exposes password-manager autocomplete attributes for registration', async () => {
    await createComponent();

    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    expect(inputs[0].getAttribute('autocomplete')).toBe('given-name');
    expect(inputs[1].getAttribute('autocomplete')).toBe('family-name');
    expect(inputs[2].getAttribute('autocomplete')).toBe('email');
    expect(inputs[3].getAttribute('autocomplete')).toBe('tel');
    expect(inputs[4].getAttribute('autocomplete')).toBe('new-password');
    expect(inputs[5].getAttribute('autocomplete')).toBe('new-password');
  });

  it('preserves the return URL when navigating back to Sign in', async () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/tabs/profile' });
    await createComponent();

    page.goToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/tabs/profile' },
    });
  });

  it('does not render the tabs shell on the registration page', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
  });
});
