import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { PrayerPage } from './prayer.page';

describe('PrayerPage', () => {
  let page: PrayerPage;
  let fixture: { nativeElement: HTMLElement } | null;
  let router: jasmine.SpyObj<{ navigateByUrl: (url: string) => Promise<boolean> }>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<{ id: number; role: string; can_use_member_app?: boolean } | null>;

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<{ id: number; role: string; can_use_member_app?: boolean } | null>(null);
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      imports: [PrayerPage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: authState$.asObservable(),
            currentUser$: currentUser$.asObservable(),
          },
        },
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: jasmine.createSpyObj<NavController>('NavController', ['navigateBack']) },
      ],
    });
    page = TestBed.runInInjectionContext(() => new PrayerPage());
    fixture = null;
  });

  afterEach(() => {
    page.ngOnDestroy();
  });

  function createComponent(): HTMLElement {
    const componentFixture = TestBed.createComponent(PrayerPage);
    componentFixture.detectChanges();
    fixture = componentFixture;
    return componentFixture.nativeElement as HTMLElement;
  }

  it('shows only public actions for guests', () => {
    page.ngOnInit();

    expect(page.showMemberAction).toBeFalse();
    expect(page.primaryActions.map((action) => action.route)).toEqual([
      '/tabs/prayer/submit',
      '/tabs/prayer/community',
    ]);
  });

  it('shows my prayer requests for authenticated members', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ id: 1, role: 'member', can_use_member_app: true });

    expect(page.showMemberAction).toBeTrue();
  });

  it('shows my prayer requests when the member role casing is inconsistent', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ id: 2, role: ' Member ', can_use_member_app: true });

    expect(page.showMemberAction).toBeTrue();
  });

  it('shows my prayer requests for eligible admin-role users', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ id: 3, role: 'platform_admin', can_use_member_app: true });

    expect(page.showMemberAction).toBeTrue();
  });

  it('does not show my prayer requests for authenticated users without member-app capability', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ id: 4, role: 'platform_admin', can_use_member_app: false });

    expect(page.showMemberAction).toBeFalse();
  });

  it('navigates actions to their configured routes', () => {
    page.openAction('/tabs/prayer/community');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/prayer/community');
  });

  it('removes the stay connected in prayer intro card', () => {
    const element = createComponent();

    expect(element.textContent).not.toContain('Stay connected in prayer');
    expect(element.textContent).not.toContain('OPEN TO EVERYONE');
  });

  it('still renders the public prayer action cards', () => {
    const element = createComponent();

    expect(element.textContent).toContain('Submit a Prayer Request');
    expect(element.textContent).toContain('Community Prayers');
  });

  it('keeps my prayer requests hidden for guests in the rendered template', () => {
    const element = createComponent();

    expect(element.textContent).not.toContain('My Prayer Requests');
  });

  it('renders my prayer requests for authenticated members', () => {
    authState$.next(true);
    currentUser$.next({ id: 1, role: 'member', can_use_member_app: true });

    const element = createComponent();

    expect(element.textContent).toContain('My Prayer Requests');
  });

  it('uses the shared compact mobile header without a back button because Prayer now lives in the tabs shell', () => {
    const componentFixture = TestBed.createComponent(PrayerPage);
    componentFixture.detectChanges();

    const header = componentFixture.debugElement.query(By.directive(MobileHeaderComponent))
      ?.componentInstance as MobileHeaderComponent;

    expect(componentFixture.nativeElement.querySelector('.prayer-shell')).not.toBeNull();
    expect(header.fallbackRoute).toBe('/tabs/home');
    expect(header.showBack).toBeFalse();
    expect(header.title).toBe('Prayer');
  });
});
