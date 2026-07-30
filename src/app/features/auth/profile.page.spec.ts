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
        { provide: NavController, useValue: {} },
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
    Object.defineProperty(router, 'url', { value: '/tabs/more' });
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

  it('renders the member profile when the request succeeds', async () => {
    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Member User');
    expect(fixture.nativeElement.textContent).toContain('member@example.com');
    expect(fixture.nativeElement.textContent).toContain('+39333111222');
  });

  it('keeps visible profile content during a background refresh failure', async () => {
    authService.getCurrentUser.and.returnValues(
      of(profile),
      throwError(() => new Error('network'))
    );

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

  it('prevents duplicate quick-action navigation from rapid taps', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );

    await createComponent();

    page.openQuickAction({
      title: 'Bible Study',
      subtitle: 'Browse manuals',
      icon: 'book-outline',
      route: '/tabs/bible-study',
    });
    page.openQuickAction({
      title: 'Bible Study',
      subtitle: 'Browse manuals',
      icon: 'book-outline',
      route: '/tabs/bible-study',
    });

    expect(router.navigateByUrl.calls.count()).toBe(1);
    resolveNavigation?.(true);
    await fixture.whenStable();
  });

  it('prevents duplicate logout requests and navigates to login', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );

    await createComponent();

    page.logout();
    page.logout();

    expect(authService.logout.calls.count()).toBe(1);
    expect(router.navigateByUrl.calls.count()).toBe(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });

    resolveNavigation?.(true);
    await fixture.whenStable();
  });

  it('renders the More header without a back button on the top-level tabs route', async () => {
    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('More');
    expect(fixture.nativeElement.querySelector('.app-header__back')).toBeNull();
  });
});
