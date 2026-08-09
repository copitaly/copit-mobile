import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { RegisterFormComponent } from './register-form.component';
import { RegisterPage } from './register.page';
import { LEGAL_LINKS } from '../../core/constants/legal-links';

describe('RegisterFormComponent', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let component: RegisterFormComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

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

  async function createForm(
    inputs?: Partial<Pick<RegisterFormComponent, 'appearance' | 'returnUrl' | 'showFooter' | 'heading'>>
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    Object.assign(component, inputs);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('rejects invalid email formats inline', async () => {
    await createForm();

    component.form.controls.email.setValue('invalid-email');
    component.form.controls.email.markAsTouched();
    fixture.detectChanges();

    expect(component.showEmailError).toBeTrue();
    expect(component.emailErrorMessage).toBe('Enter a valid email address.');
  });

  it('requires the expected registration fields', async () => {
    await createForm();

    component.submit();
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
    await createForm();

    component.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    component.submit();
    component.submit();

    expect(authService.register.calls.count()).toBe(1);
    expect(component.loading).toBeTrue();
    expect(component.canSubmit).toBeFalse();
    response$.complete();
  });

  it('navigates to the Profile tab after successful registration when a Profile return URL is provided', async () => {
    authService.register.and.returnValue(of(authResponse));
    await createForm({ returnUrl: '/tabs/profile' });

    component.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    component.submit();

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
    await createForm();

    component.form.setValue({
      first_name: 'Kojo',
      last_name: 'Mensah',
      email: 'kojo@example.com',
      phone_number: '',
      password: 'secret123',
      confirm_password: 'secret123',
    });
    component.submit();

    expect(component.errorMessage).toBe('An account already exists for this email.');
  });

  it('exposes password-manager autocomplete attributes for registration', async () => {
    await createForm();

    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    expect(inputs[0].getAttribute('autocomplete')).toBe('given-name');
    expect(inputs[1].getAttribute('autocomplete')).toBe('family-name');
    expect(inputs[2].getAttribute('autocomplete')).toBe('email');
    expect(inputs[3].getAttribute('autocomplete')).toBe('tel');
    expect(inputs[4].getAttribute('autocomplete')).toBe('new-password');
    expect(inputs[5].getAttribute('autocomplete')).toBe('new-password');
  });

  it('preserves the return URL when navigating back to Sign in from standalone registration', async () => {
    await createForm({ returnUrl: '/tabs/profile' });

    component.goToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/tabs/profile' },
    });
  });

  it('returns to the embedded Profile sign-in state from embedded registration', async () => {
    await createForm({ appearance: 'embedded', returnUrl: '/tabs/profile' });

    component.goToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/tabs/profile'], { replaceUrl: true });
  });

  it('renders the responsive first and last name structure in embedded mode', async () => {
    await createForm({ appearance: 'embedded', heading: 'Create your account' });

    expect(fixture.nativeElement.querySelector('[data-testid="register-name-grid"]')).not.toBeNull();
    expect(fixture.debugElement.queryAll(By.css('ion-input')).length).toBe(6);
    expect(fixture.nativeElement.querySelector('[data-testid="register-form-heading"]')?.textContent).toContain(
      'Create your account'
    );
  });

  it('navigates to the internal Terms page without launching an external browser', async () => {
    await createForm();

    const termsLink = fixture.nativeElement.querySelectorAll('.auth-legal-link')[0] as HTMLAnchorElement;
    termsLink.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith(LEGAL_LINKS.termsAndConditions, {
      state: { fallbackRoute: '/register' },
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the internal Privacy Policy page without launching an external browser', async () => {
    await createForm();

    const privacyLink = fixture.nativeElement.querySelectorAll('.auth-legal-link')[1] as HTMLAnchorElement;
    privacyLink.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith(LEGAL_LINKS.privacyPolicy, {
      state: { fallbackRoute: '/register' },
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('preserves the embedded Profile register fallback when opening legal pages', async () => {
    await createForm({ appearance: 'embedded', returnUrl: '/tabs/profile' });

    component.openPrivacyPolicy(new MouseEvent('click'));

    expect(router.navigateByUrl).toHaveBeenCalledWith(LEGAL_LINKS.privacyPolicy, {
      state: { fallbackRoute: '/tabs/profile?authMode=register' },
    });
  });
});

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  async function createPage(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: NavController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register'], {
      isAuthenticatedSnapshot: false,
      accessTokenSnapshot: null,
    });
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    activatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };
  });

  it('keeps the standalone registration route functional without tabs for deep-link compatibility', async () => {
    await createPage();

    expect(fixture.nativeElement.querySelector('[data-testid="register-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Create account');
  });

  it('redirects authenticated users away from the standalone registration route', async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register'], {
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
    });

    await createPage();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });
});
