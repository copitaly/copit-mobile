import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ForgotPasswordFormComponent } from './forgot-password-form.component';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordFormComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordFormComponent>;
  let component: ForgotPasswordFormComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  async function createForm(
    inputs?: Partial<Pick<ForgotPasswordFormComponent, 'appearance' | 'heading'>>
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordFormComponent);
    component = fixture.componentInstance;
    Object.assign(component, inputs);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('does not render the old card heading by default on the standalone page', async () => {
    await createForm();

    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-form-heading"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Reset your password');
  });

  it('renders the optional embedded recovery heading when provided', async () => {
    await createForm({ appearance: 'embedded', heading: 'Reset your password' });

    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-form-heading"]')?.textContent).toContain(
      'Reset your password'
    );
  });

  it('shows Send reset link as the idle CTA label', async () => {
    await createForm();

    expect(fixture.nativeElement.querySelector('.auth-submit')?.textContent).toContain('Send reset link');
  });

  it('renders Sign In and Create Account links beneath the recovery form', async () => {
    await createForm();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Remembered your password?');
    expect(text).toContain('Sign In');
    expect(text).toContain("Don't have an account?");
    expect(text).toContain('Create Account');
  });

  it('keeps the disabled and enabled submit states accurate', async () => {
    await createForm();

    expect(component.canSubmit).toBeFalse();

    component.form.controls.email.setValue('member@example.com');
    fixture.detectChanges();

    expect(component.canSubmit).toBeTrue();
  });

  it('validates email format before submitting', async () => {
    await createForm();

    component.form.controls.email.setValue('invalid-email');
    component.form.controls.email.markAsTouched();
    component.submit();

    expect(component.showEmailError).toBeTrue();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('submits the existing payload shape unchanged', async () => {
    authService.forgotPassword.and.returnValue(of({ success: true }));
    await createForm();

    component.form.controls.email.setValue(' member@example.com ');
    component.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'member@example.com' });
  });

  it('prevents repeated forgot-password submissions while loading', async () => {
    const response$ = new Subject<any>();
    authService.forgotPassword.and.returnValue(response$.asObservable());
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();
    component.submit();

    expect(authService.forgotPassword.calls.count()).toBe(1);
    expect(component.loading).toBeTrue();
    response$.complete();
  });

  it('shows the calm neutral success response after submission', async () => {
    authService.forgotPassword.and.returnValue(of({ success: true }));
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.submitted).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-success"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Check your email');
    expect(fixture.nativeElement.textContent).toContain(
      "We've sent password reset instructions if an account exists for that address."
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Open your email and follow the link to create a new password.'
    );
    expect(document.activeElement?.textContent ?? '').toContain('Check your email');
  });

  it('uses the same neutral completion state for account-not-found-style backend responses', async () => {
    authService.forgotPassword.and.returnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 404,
          error: { detail: 'No account was found for this email address.' },
        })
      )
    );
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();

    expect(component.submitted).toBeTrue();
    expect(component.message).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Check your email');
  });

  it('shows the offline failure message for network errors', async () => {
    authService.forgotPassword.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();

    expect(component.message).toBe('Unable to connect. Check your internet connection and try again.');
  });

  it('uses the email autofill attribute for the reset form', async () => {
    await createForm();

    const input = fixture.nativeElement.querySelector('ion-input') as HTMLElement | null;
    expect(input?.getAttribute('autocomplete')).toBe('email');
  });

  it('navigates back to embedded Profile sign-in with replace navigation', async () => {
    authService.forgotPassword.and.returnValue(of({ success: true }));
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();

    component.goToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/tabs/profile'], { replaceUrl: true });
  });

  it('opens embedded Profile Create Account with replace navigation', async () => {
    await createForm();

    component.goToRegister();

    expect(router.navigate).toHaveBeenCalledWith(['/tabs/profile'], {
      queryParams: { authMode: 'register' },
      replaceUrl: true,
    });
  });

  it('keeps the success state Back to Sign In and Create Account actions available', async () => {
    authService.forgotPassword.and.returnValue(of({ success: true }));
    await createForm();

    component.form.controls.email.setValue('member@example.com');
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Back to Sign In');
    expect(fixture.nativeElement.textContent).toContain('Create Account');
  });
});

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  async function createPage(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: NavController, useValue: jasmine.createSpyObj<NavController>('NavController', ['back']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('renders the standalone recovery page without bottom tabs', async () => {
    await createPage();

    expect(fixture.nativeElement.textContent).toContain('Forgot password');
    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-card"]')).not.toBeNull();
  });

  it('keeps the standard back button with the /tabs/profile fallback', async () => {
    await createPage();

    const backButton = fixture.nativeElement.querySelector('ion-back-button') as HTMLElement | null;
    expect(backButton).not.toBeNull();
    expect(backButton?.getAttribute('defaulthref')).toBe('/tabs/profile');
    expect(backButton?.getAttribute('aria-label')).toBe('Back to Sign In');
  });

  it('avoids the blank-screen regression by rendering visible recovery copy', async () => {
    await createPage();

    expect(fixture.nativeElement.textContent).toContain(
      "Enter your email and we'll send you instructions to reset your password."
    );
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-form-shell"]')).not.toBeNull();
  });
});
