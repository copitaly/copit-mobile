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

    expect(labels).toEqual(['Home', 'Bible', 'Prayer', 'Community', 'More']);
  });

  it('marks the Bible tab active on the Bible Study tab route', async () => {
    await createComponent('/tabs/bible-study');

    expect(fixture.nativeElement.querySelector('[data-testid="tab-button-bible-study"]')?.className).toContain(
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

    expect(childPaths).toEqual(['home', 'bible-study', 'prayer', 'community', 'more', '']);
    expect(tabsRoute?.children?.find((child) => child.path === '')?.redirectTo).toBe('home');
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

  it('keeps Bible Study detail and reader routes outside the tabs child route tree', async () => {
    const router = await createRouter();
    const tabsRoute = router.config.find((item) => item.path === 'tabs');

    expect(router.config.find((item) => item.path === 'bible-study/:id')).toBeDefined();
    expect(router.config.find((item) => item.path === 'bible-study/:id/read')).toBeDefined();
    expect(tabsRoute?.children?.some((child) => child.path === 'bible-study/:id')).toBeFalse();
    expect(tabsRoute?.children?.some((child) => child.path === 'bible-study/:id/read')).toBeFalse();
  });
});
