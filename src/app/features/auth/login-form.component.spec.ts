import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

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

  async function createComponent(inputs?: Partial<Pick<LoginFormComponent, 'appearance' | 'returnUrl' | 'showFooter' | 'heading'>>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    Object.assign(component, inputs);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('shows required field validation when submitted empty', async () => {
    await createComponent();

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter your email or phone number.');
    expect(fixture.nativeElement.textContent).toContain('Enter your password.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('navigates to the provided Profile return URL after successful login', async () => {
    authService.login.and.returnValue(of(authResponse));
    await createComponent({ returnUrl: '/tabs/profile' });

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/profile', { replaceUrl: true });
  });

  it('uses the approved fallback when no return URL is provided', async () => {
    authService.login.and.returnValue(of(authResponse));
    await createComponent();

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('rejects invalid external return URLs', async () => {
    authService.login.and.returnValue(of(authResponse));
    await createComponent({ returnUrl: 'https://evil.example/steal' });

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('preserves the return URL when opening Create Account', async () => {
    await createComponent({ returnUrl: '/tabs/profile' });

    component.goToRegister();

    expect(router.navigate).toHaveBeenCalledWith(['/register'], {
      queryParams: { returnUrl: '/tabs/profile' },
    });
  });

  it('preserves the return URL when opening Forgot Password from the embedded Profile login', async () => {
    await createComponent({ returnUrl: '/tabs/profile', appearance: 'embedded' });

    component.onForgotPassword();

    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: { returnUrl: '/tabs/profile' },
    });
  });

  it('keeps forgot-password navigation unchanged for the default fallback flow', async () => {
    await createComponent();

    component.onForgotPassword();

    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: undefined,
    });
  });

  it('disables duplicate submissions while login is in progress', async () => {
    const response$ = new Subject<MemberProfile>();
    authService.login.and.returnValue(response$.asObservable());
    await createComponent();

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();
    component.submit();

    expect(authService.login.calls.count()).toBe(1);
    expect(component.loading).toBeTrue();
    expect(component.canSubmit).toBeFalse();

    response$.complete();
  });

  it('shows the secure credential failure message', async () => {
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await createComponent();

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Incorrect email or password.');
  });

  it('shows the offline message for status 0 failures', async () => {
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await createComponent();

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    component.submit();

    expect(component.errorMessage).toBe('Unable to connect. Check your internet connection and try again.');
  });

  it('updates the password visibility label as the toggle changes', async () => {
    await createComponent();

    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    component.togglePasswordVisibility();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('configures username and current-password autofill attributes', async () => {
    await createComponent();

    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    expect(inputs[0].getAttribute('autocomplete')).toBe('username');
    expect(inputs[1].getAttribute('autocomplete')).toBe('current-password');
  });

  it('uses Sign In as the idle CTA label and keeps the disabled state accurate', async () => {
    await createComponent();

    const submitButton = fixture.nativeElement.querySelector('.auth-submit') as HTMLElement | null;
    expect(submitButton?.textContent).toContain('Sign In');
    expect(component.canSubmit).toBeFalse();

    component.form.setValue({ identifier: 'member@example.com', password: 'secret123' });
    fixture.detectChanges();

    expect(component.canSubmit).toBeTrue();
  });

  it('renders the embedded appearance without the standalone auth shell', async () => {
    await createComponent({ appearance: 'embedded', returnUrl: '/tabs/profile', heading: 'Sign in' });

    const shell = fixture.nativeElement.querySelector('[data-testid="login-form-shell"]') as HTMLElement | null;
    expect(shell?.className).toContain('login-form-shell--embedded');
    expect(fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]')).toBeNull();
  });

  it('renders the optional embedded form heading when provided', async () => {
    await createComponent({ appearance: 'embedded', heading: 'Sign in' });

    expect(fixture.nativeElement.querySelector('[data-testid="login-form-heading"]')?.textContent).toContain('Sign in');
  });

  it('keeps the form controls available in the rendered template', async () => {
    await createComponent();

    expect(fixture.debugElement.queryAll(By.css('ion-input')).length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Forgot password?');
  });
});
