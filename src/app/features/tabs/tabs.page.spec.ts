import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AppRoutingModule } from '../../app-routing.module';
import { AuthService } from '../../core/services/auth.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let fixture: ComponentFixture<TabsPage>;
  let router: jasmine.SpyObj<Router>;

  async function createComponent(url = '/tabs/bible-study'): Promise<void> {
    Object.defineProperty(router, 'url', { value: url });

    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], { events: of() });
    (router as Router & { createUrlTree: jasmine.Spy; serializeUrl: jasmine.Spy }).createUrlTree =
      jasmine.createSpy('createUrlTree').and.callFake((commands: unknown) => commands);
    (router as Router & { createUrlTree: jasmine.Spy; serializeUrl: jasmine.Spy }).serializeUrl =
      jasmine.createSpy('serializeUrl').and.callFake((value: unknown) =>
        Array.isArray(value) ? value.join('') : String(value ?? '')
      );
  });

  it('renders five primary tab buttons', async () => {
    await createComponent();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button ion-label')).map(
      (node) => (node as HTMLElement).textContent?.trim() ?? ''
    );

    expect(labels).toEqual(['Home', 'Bible Study', 'Devotionals', 'Donate', 'Profile']);
  });

  it('uses ion-tabs as the shell root so the routed outlet is not wrapped in an extra ion-page layer', async () => {
    await createComponent();

    expect(fixture.nativeElement.firstElementChild?.tagName.toLowerCase()).toBe('ion-tabs');
    expect(fixture.nativeElement.querySelector('ion-page')).toBeNull();
  });

  it('keeps the tabs shell free of a manually nested ion-router-outlet', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelector('ion-tabs > ion-router-outlet')).toBeNull();
  });

  it('marks the Bible tab active on the Bible Study tab route', async () => {
    await createComponent('/tabs/bible-study');

    expect(fixture.nativeElement.querySelector('[data-testid="tab-button-bible-study"]')?.className).toContain(
      'app-tabs__button--active'
    );
  });

  it('marks the Devotionals tab active on the Devotionals tab route', async () => {
    await createComponent('/tabs/devotionals');

    expect(fixture.nativeElement.querySelector('[data-testid="tab-button-devotionals"]')?.className).toContain(
      'app-tabs__button--active'
    );
  });

  it('marks the Donate tab active on the Donate tab route', async () => {
    await createComponent('/tabs/donate');

    expect(fixture.nativeElement.querySelector('[data-testid="tab-button-donate"]')?.className).toContain(
      'app-tabs__button--active'
    );
  });

  it('marks the Profile tab active on the Profile tab route', async () => {
    await createComponent('/tabs/profile');

    expect(fixture.nativeElement.querySelector('[data-testid="tab-button-profile"]')?.className).toContain(
      'app-tabs__button--active'
    );
  });
});

describe('Tabs routing', () => {
  async function createRouter(): Promise<Router> {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: false,
            accessTokenSnapshot: null,
            currentUserSnapshot: null,
            getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
          },
        },
        {
          provide: SentryTelemetryService,
          useValue: {
            addFeatureBreadcrumb: jasmine.createSpy('addFeatureBreadcrumb'),
            captureFeatureError: jasmine.createSpy('captureFeatureError'),
          },
        },
      ],
    }).compileComponents();

    return TestBed.inject(Router);
  }

  it('defines the canonical tabs child routes with home as the default child redirect', async () => {
    const router = await createRouter();
    const tabsRoute = router.config.find((item) => item.path === 'tabs');
    const childPaths = tabsRoute?.children?.map((child) => child.path);

    expect(childPaths).toEqual(['home', 'bible-study', 'prayer', 'devotionals', 'donate', 'community', 'more', 'profile', '']);
    expect(tabsRoute?.children?.find((child) => child.path === '')?.redirectTo).toBe('home');
  });

  it('keeps exactly five top-level tab destinations inside the tabs shell', async () => {
    const router = await createRouter();
    const tabsRoute = router.config.find((item) => item.path === 'tabs');
    const topLevelTabChildren = tabsRoute?.children?.filter((child) =>
      ['home', 'bible-study', 'devotionals', 'donate', 'profile'].includes(child.path ?? '')
    );

    expect(topLevelTabChildren?.length).toBe(5);
    expect(topLevelTabChildren?.every((child) => !!child.loadComponent)).toBeTrue();
  });

  it('redirects the legacy /home route to the canonical Home tab route', async () => {
    const router = await createRouter();
    const route = router.config.find((item) => item.path === 'home');

    expect(route?.redirectTo).toBe('tabs/home');
  });

  it('redirects the legacy /bible-study route to the canonical Bible tab route', async () => {
    const router = await createRouter();
    const route = router.config.find((item) => item.path === 'bible-study');

    expect(route?.redirectTo).toBe('tabs/bible-study');
  });

  it('redirects the legacy /devotionals route to the canonical Devotionals tab route', async () => {
    const router = await createRouter();
    const route = router.config.find((item) => item.path === 'devotionals');

    expect(route?.redirectTo).toBe('tabs/devotionals');
  });

  it('redirects the legacy /donate route to the canonical Donate tab route', async () => {
    const router = await createRouter();
    const donateRoutes = router.config.filter((item) => item.path === 'donate');

    expect(donateRoutes.some((route) => route.redirectTo === 'tabs/donate')).toBeTrue();
  });

  it('redirects the legacy /profile and /tabs/more routes to the canonical Profile tab route', async () => {
    const router = await createRouter();
    const profileRoute = router.config.find((item) => item.path === 'profile');
    const tabsRoute = router.config.find((item) => item.path === 'tabs');

    expect(profileRoute?.redirectTo).toBe('tabs/profile');
    expect(tabsRoute?.children?.find((child) => child.path === 'more')?.redirectTo).toBe('/tabs/profile');
  });

  it('keeps Prayer and Community as standalone pages outside the primary tab destinations', async () => {
    const router = await createRouter();
    const prayerRoute = router.config.find((item) => item.path === 'prayer');
    const communityRoute = router.config.find((item) => item.path === 'community');
    const tabsRoute = router.config.find((item) => item.path === 'tabs');

    expect(prayerRoute?.loadComponent).toBeDefined();
    expect(communityRoute?.loadComponent).toBeDefined();
    expect(tabsRoute?.children?.find((child) => child.path === 'prayer')?.redirectTo).toBe('/prayer');
    expect(tabsRoute?.children?.find((child) => child.path === 'community')?.redirectTo).toBe('/community');
  });

  it('keeps Bible Study detail and reader routes outside the tabs child route tree', async () => {
    const router = await createRouter();
    const tabsRoute = router.config.find((item) => item.path === 'tabs');

    expect(router.config.find((item) => item.path === 'bible-study/:id')).toBeDefined();
    expect(router.config.find((item) => item.path === 'bible-study/:id/read')).toBeDefined();
    expect(tabsRoute?.children?.some((child) => child.path === 'bible-study/:id')).toBeFalse();
    expect(tabsRoute?.children?.some((child) => child.path === 'bible-study/:id/read')).toBeFalse();
  });
});
