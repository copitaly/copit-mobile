import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let page: ProfilePage;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let authService: {
    currentUser$: BehaviorSubject<MemberProfile | null>;
    currentUserSnapshot: MemberProfile | null;
    isAuthenticatedSnapshot: boolean;
    accessTokenSnapshot: string | null;
    getCurrentUser: jasmine.Spy;
    logout: jasmine.Spy;
  };

  const profile: MemberProfile = {
    id: 7,
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
      imports: [ProfilePage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: jasmine.createSpyObj<NavController>('NavController', ['navigateBack']) },
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

    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());

    authService = {
      currentUser$: new BehaviorSubject<MemberProfile | null>(null),
      currentUserSnapshot: null,
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(of(profile)),
      logout: jasmine.createSpy('logout'),
    };
  });

  it('shows a loading state before the profile request resolves', async () => {
    const response$ = new Subject<MemberProfile | null>();
    authService.getCurrentUser.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Loading profile');
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

  it('renders a signed-out state when no profile data is available', async () => {
    authService.getCurrentUser.and.returnValue(of(null));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Sign in required');
    expect(fixture.nativeElement.textContent).toContain('Go to Login');
  });

  it('prevents duplicate logout requests and invokes the existing logout flow', async () => {
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
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });

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
