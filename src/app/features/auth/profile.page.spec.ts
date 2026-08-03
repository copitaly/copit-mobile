import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let page: ProfilePage;
  let router: jasmine.SpyObj<Router>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authService: {
    currentUser$: BehaviorSubject<MemberProfile | null>;
    currentUserSnapshot: MemberProfile | null;
    isAuthenticatedSnapshot: boolean;
    accessTokenSnapshot: string | null;
    getCurrentUser: jasmine.Spy;
    logout: jasmine.Spy;
    login: jasmine.Spy;
  };

  const profile: MemberProfile = {
    id: 7,
    email: 'member@example.com',
    first_name: 'Member',
    last_name: 'User',
    role: 'member',
    phone_number: '+39333111222',
    language: 'en',
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
      imports: [ProfilePage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
        {
          provide: SentryTelemetryService,
          useValue: {
            addFeatureBreadcrumb: jasmine.createSpy('addFeatureBreadcrumb'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    Object.defineProperty(router, 'url', { value: '/tabs/profile' });
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    authService = {
      currentUser$: new BehaviorSubject<MemberProfile | null>(null),
      currentUserSnapshot: null,
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(of(profile)),
      logout: jasmine.createSpy('logout'),
      login: jasmine.createSpy('login'),
    };
  });

  it('shows a loading state before the profile request resolves', async () => {
    const response$ = new Subject<MemberProfile | null>();
    authService.getCurrentUser.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Loading profile');
    response$.next(profile);
    response$.complete();
  });

  it('renders the premium account summary data', async () => {
    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Profile');
    expect(text).toContain('Member User');
    expect(text).toContain('member@example.com');
    expect(text).toContain('Member account');
    expect(text).toContain('Member since 2026');
    expect(text).toContain('Edit Profile');
    expect(fixture.nativeElement.querySelector('.cop-page-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.account-card')?.className).toContain('cop-card');
  });

  it('renders compact membership metadata on one summary line', async () => {
    await createComponent();

    const summary = fixture.nativeElement.querySelector('.account-meta') as HTMLElement | null;
    expect(summary?.textContent).toContain('Member account');
    expect(summary?.textContent).toContain('Member since 2026');
  });

  it('renders the top-level Profile tab without a back button', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelector('.app-header__back')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
  });

  it('navigates to Edit Profile from the account summary card', async () => {
    await createComponent();

    page.goToEditProfile();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile/account-settings/edit-profile');
  });

  it('navigates to Account Settings from the personal section', async () => {
    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="account-settings"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile/account-settings');
  });

  it('navigates to My Donations from the giving section', async () => {
    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="my-donations"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-donations');
  });

  it('navigates to Recurring Donations from the giving section', async () => {
    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="recurring-donations"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile/recurring-donations');
  });

  it('navigates to Saved Churches from the church section', async () => {
    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="saved-churches"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/saved-churches');
  });

  it('keeps My Prayer Requests visible for members', async () => {
    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('My Prayer Requests');
  });

  it('hides member-only prayer history when the resolved role is not member', async () => {
    authService.getCurrentUser.and.returnValue(of({ ...profile, role: 'platform_admin' }));

    await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('My Prayer Requests');
  });

  it('keeps visible profile content during a background refresh failure', async () => {
    authService.getCurrentUser.and.returnValues(of(profile), throwError(() => new Error('network')));

    await createComponent();
    page.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.profile?.id).toBe(7);
    expect(page.errorMessage).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Member User');
  });

  it('shows a retryable error when the initial profile load fails', async () => {
    authService.getCurrentUser.and.returnValue(throwError(() => new Error('network')));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain("We couldn't load your profile");
    expect(fixture.nativeElement.textContent).toContain('Please check your connection and try again.');
  });

  it('renders the embedded login state when the Profile tab is opened while signed out', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    authService.currentUserSnapshot = null;

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Sign in to access your account, giving history, and church connections.');
    expect(fixture.nativeElement.textContent).not.toContain('Welcome back');
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-heading"]')?.textContent).toContain('Sign in to your account');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')?.className).toContain('cop-card');
    expect(fixture.nativeElement.textContent).toContain('Why create an account?');
    expect(fixture.nativeElement.textContent).toContain('View your giving history');
    expect(fixture.nativeElement.textContent).toContain('Read Bible Study manuals');
    expect(fixture.nativeElement.textContent).toContain('Save churches for quick access');
    expect(fixture.nativeElement.textContent).toContain('Submit prayer requests');
    expect(fixture.nativeElement.textContent).not.toContain('WHY CREATE AN ACCOUNT?');
    expect(fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Sign in to continue');
  });

  it('keeps the benefits card only on the embedded sign-in state', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).not.toBeNull();
  });

  it('renders the benefits as informational rows rather than buttons or links', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    const benefitsCard = fixture.nativeElement.querySelector('[data-testid="profile-benefits"]') as HTMLElement | null;
    expect(benefitsCard?.querySelectorAll('button').length).toBe(0);
    expect(benefitsCard?.querySelectorAll('a').length).toBe(0);
  });

  it('renders the signed-out subtitle only once above the embedded login card', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    const text = fixture.nativeElement.textContent as string;
    const matches = text.match(/Sign in to access your account, giving history, and church connections\./g) ?? [];

    expect(matches.length).toBe(1);
  });

  it('defaults signed-out direct Profile access to the embedded sign-in mode', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    expect(page.authMode).toBe('sign-in');
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="register-form-shell"]')).toBeNull();
  });

  it('switches to embedded Create Account mode inside the Profile tab when authMode=register', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    queryParamMap$.next(convertToParamMap({ authMode: 'register' }));

    await createComponent();

    expect(page.authMode).toBe('register');
    expect(fixture.nativeElement.textContent).toContain('Create your account to access your giving, Bible studies, churches, and prayer requests.');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-register-card"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="register-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-shell"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Welcome back');
  });

  it('returns from embedded Create Account to embedded sign-in when the auth mode query param is cleared', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    queryParamMap$.next(convertToParamMap({ authMode: 'register' }));

    await createComponent();

    queryParamMap$.next(convertToParamMap({}));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.authMode).toBe('sign-in');
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="register-form-shell"]')).toBeNull();
  });

  it('renders embedded Forgot Password inside the Profile tab with no back button and no benefits card', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    queryParamMap$.next(convertToParamMap({ authMode: 'forgot-password' }));

    await createComponent();

    expect(page.authMode).toBe('forgot-password');
    expect(fixture.nativeElement.querySelector('#profile-title')?.textContent).toContain('Forgot password');
    expect(fixture.nativeElement.textContent).toContain("Enter your email and we'll send you a reset link.");
    expect(fixture.nativeElement.textContent).not.toContain('Reset your password');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-forgot-password-card"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-form-shell"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="forgot-password-form-heading"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
  });

  it('keeps the Profile tab route active during embedded Forgot Password', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    queryParamMap$.next(convertToParamMap({ authMode: 'forgot-password' }));

    await createComponent();

    expect(page.isTabsProfileRoute).toBeTrue();
    expect(fixture.nativeElement.querySelector('#profile-title')?.textContent).not.toContain('Profile');
  });

  it('keeps the Profile tab route active while signed out', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    expect(page.isTabsProfileRoute).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/login', jasmine.anything());
  });

  it('shows the authenticated Profile content after the shared login state resolves', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;

    await createComponent();

    authService.currentUser$.next(profile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Member User');
    expect(fixture.nativeElement.querySelector('[data-testid="login-form-shell"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).toBeNull();
  });

  it('does not render the embedded registration state once the user is authenticated', async () => {
    authService.isAuthenticatedSnapshot = false;
    authService.accessTokenSnapshot = null;
    queryParamMap$.next(convertToParamMap({ authMode: 'register' }));

    await createComponent();

    authService.currentUser$.next(profile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Member User');
    expect(fixture.nativeElement.querySelector('[data-testid="register-form-shell"]')).toBeNull();
  });

  it('never renders the benefits card once the user is authenticated', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="profile-benefits"]')).toBeNull();
  });

  it('prevents duplicate logout requests and keeps the user inside the Profile tab', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );

    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="sign-out"]') as HTMLButtonElement | null;
    button?.click();
    button?.click();

    expect(authService.logout.calls.count()).toBe(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/profile', { replaceUrl: true });

    resolveNavigation?.(true);
    await fixture.whenStable();
  });

  it('renders Sign Out as a standalone action outside the account rows card', async () => {
    await createComponent();

    const signOutButton = fixture.nativeElement.querySelector('.sign-out-row') as HTMLElement | null;
    const accountCardText = Array.from<Element>(fixture.nativeElement.querySelectorAll('.profile-group .profile-group__card'))
      .map((element) => element.textContent || '')
      .join(' ');

    expect(signOutButton?.textContent).toContain('Sign Out');
    expect(accountCardText).not.toContain('Sign Out');
  });

  it('retains the destructive Delete Account navigation flow', async () => {
    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="delete-account"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile/account-settings/delete-account');
  });

  it('prevents duplicate quick-action navigation from rapid taps', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );

    await createComponent();

    const prayerButton = fixture.nativeElement.querySelector('[data-testid="prayer"]') as HTMLButtonElement | null;
    prayerButton?.click();
    prayerButton?.click();

    expect(router.navigateByUrl.calls.count()).toBe(1);
    resolveNavigation?.(true);
    await fixture.whenStable();
  });
});
