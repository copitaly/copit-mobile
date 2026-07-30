import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let page: LoginPage;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  const authResponse = {
    id: 1,
    email: 'member@example.com',
    first_name: 'Test',
    last_name: 'Member',
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
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['login'],
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

  it('shows required field validation when submitted empty', async () => {
    await createComponent();

    page.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter your email or phone number.');
    expect(fixture.nativeElement.textContent).toContain('Enter your password.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('navigates to the Profile tab after successful login when a Profile return URL is provided', async () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/tabs/profile' });
    authService.login.and.returnValue(of(authResponse));
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/profile', { replaceUrl: true });
  });

  it('uses the approved fallback when no return URL is provided', async () => {
    authService.login.and.returnValue(of(authResponse));
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('rejects invalid external return URLs', async () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: 'https://evil.example/steal' });
    authService.login.and.returnValue(of(authResponse));
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('preserves the return URL when opening Create Account', async () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/tabs/profile' });
    await createComponent();

    page.goToRegister();

    expect(router.navigate).toHaveBeenCalledWith(['/register'], {
      queryParams: { returnUrl: '/tabs/profile' },
    });
  });

  it('keeps forgot-password navigation unchanged', async () => {
    await createComponent();

    page.onForgotPassword();

    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });

  it('disables duplicate submissions while login is in progress', async () => {
    const response$ = new Subject<any>();
    authService.login.and.returnValue(response$.asObservable());
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();
    page.submit();

    expect(authService.login.calls.count()).toBe(1);
    expect(page.loading).toBeTrue();
    expect(page.canSubmit).toBeFalse();
    response$.complete();
  });

  it('shows the secure credential failure message', async () => {
    authService.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();
    fixture.detectChanges();

    expect(page.errorMessage).toBe('Incorrect email or password.');
  });

  it('shows the offline message for status 0 failures', async () => {
    authService.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );
    await createComponent();

    page.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    page.submit();

    expect(page.errorMessage).toBe('Unable to connect. Check your internet connection and try again.');
  });

  it('updates the password visibility label as the toggle changes', async () => {
    await createComponent();

    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    page.togglePasswordVisibility();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('configures username and current-password autofill attributes', async () => {
    await createComponent();

    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    expect(inputs[0].getAttribute('autocomplete')).toBe('username');
    expect(inputs[1].getAttribute('autocomplete')).toBe('current-password');
  });

  it('does not render the tabs shell on the login page', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
  });
});
