import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let page: ForgotPasswordPage;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('validates email format before submitting', async () => {
    await createComponent();

    page.form.controls.email.setValue('invalid-email');
    page.form.controls.email.markAsTouched();
    page.submit();

    expect(page.showEmailError).toBeTrue();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('prevents repeated forgot-password submissions while loading', async () => {
    const response$ = new Subject<any>();
    authService.forgotPassword.and.returnValue(response$.asObservable());
    await createComponent();

    page.form.controls.email.setValue('member@example.com');
    page.submit();
    page.submit();

    expect(authService.forgotPassword.calls.count()).toBe(1);
    expect(page.loading).toBeTrue();
    response$.complete();
  });

  it('shows the neutral success response after submission', async () => {
    authService.forgotPassword.and.returnValue(of({ success: true }));
    await createComponent();

    page.form.controls.email.setValue('member@example.com');
    page.submit();
    fixture.detectChanges();

    expect(page.submitted).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(
      'If an account exists for this email, password reset instructions have been sent.'
    );
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
    await createComponent();

    page.form.controls.email.setValue('member@example.com');
    page.submit();
    fixture.detectChanges();

    expect(page.submitted).toBeTrue();
    expect(page.message).toBe('');
    expect(fixture.nativeElement.textContent).toContain(
      'If an account exists for this email, password reset instructions have been sent.'
    );
  });

  it('shows the offline failure message for network errors', async () => {
    authService.forgotPassword.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );
    await createComponent();

    page.form.controls.email.setValue('member@example.com');
    page.submit();

    expect(page.message).toBe('Unable to connect. Check your internet connection and try again.');
  });

  it('uses the email autofill attribute for the reset form', async () => {
    await createComponent();

    const input = fixture.nativeElement.querySelector('ion-input') as HTMLElement | null;
    expect(input?.getAttribute('autocomplete')).toBe('email');
  });
});
