import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
  let fixture: ComponentFixture<ResetPasswordPage>;
  let page: ResetPasswordPage;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let activatedRoute: {
    snapshot: {
      paramMap: ReturnType<typeof convertToParamMap>;
    };
  };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['validatePasswordResetToken', 'confirmPasswordReset', 'clearLocalAuthState']
    );
    authService.validatePasswordResetToken.and.returnValue(
      of({
        status: 'valid',
        email: 'member@example.com',
        expires_at: '2026-07-31T12:00:00Z',
      })
    );
    authService.confirmPasswordReset.and.returnValue(of({ success: true }));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    activatedRoute = {
      snapshot: {
        paramMap: convertToParamMap({ uid: 'encoded-uid', token: 'secure-token' }),
      },
    };
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('validates the reset token on init and renders the reset form', async () => {
    await createComponent();

    expect(authService.validatePasswordResetToken).toHaveBeenCalledWith('encoded-uid', 'secure-token');
    expect(page.state).toBe('valid');
    expect(fixture.nativeElement.textContent).toContain('Resetting password for');
  });

  it('shows a safe invalid-link state when route params are incomplete', async () => {
    activatedRoute.snapshot.paramMap = convertToParamMap({ uid: '', token: '' });
    await createComponent();

    expect(page.state).toBe('invalid');
    expect(fixture.nativeElement.textContent).toContain('Reset link unavailable');
  });

  it('submits the new password and clears local auth state on success', async () => {
    await createComponent();

    page.form.setValue({
      new_password: 'secret123',
      confirm_password: 'secret123',
    });
    page.submit();
    fixture.detectChanges();

    expect(authService.confirmPasswordReset).toHaveBeenCalledWith('encoded-uid', 'secure-token', {
      new_password: 'secret123',
      confirm_password: 'secret123',
    });
    expect(authService.clearLocalAuthState).toHaveBeenCalled();
    expect(page.state).toBe('success');
  });

  it('shows the offline failure message for reset submission errors', async () => {
    authService.confirmPasswordReset.and.returnValue(throwError(() => ({ status: 0 })));
    await createComponent();

    page.form.setValue({
      new_password: 'secret123',
      confirm_password: 'secret123',
    });
    page.submit();

    expect(page.inlineMessage).toBe("We couldn't reset your password right now. Please try again.");
  });
});
