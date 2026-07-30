import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Router } from '@angular/router';

import { routes } from './app-routing.module';
import { AuthService } from './core/services/auth.service';
import { SentryTelemetryService } from './core/services/sentry-telemetry.service';
import { DevotionalDetailPage } from './features/devotionals/devotional-detail.page';
import { DevotionalsPage } from './features/devotionals/devotionals.page';

describe('app routes', () => {
  it('registers the canonical devotionals list route inside the tabs shell', async () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const route = tabsRoute?.children?.find((item) => item.path === 'devotionals');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalsPage);
  });

  it('registers the public devotional detail route after the legacy devotionals redirect', async () => {
    const listRouteIndex = routes.findIndex((item) => item.path === 'devotionals');
    const detailRouteIndex = routes.findIndex((item) => item.path === 'devotionals/:slug');
    const route = routes[detailRouteIndex];

    expect(detailRouteIndex).toBeGreaterThan(listRouteIndex);
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalDetailPage);
  });

  it('allows /tabs/profile to render directly without the standalone login guard', () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const profileRoute = tabsRoute?.children?.find((child) => child.path === 'profile');

    expect(profileRoute).toBeDefined();
    expect(profileRoute?.loadComponent).toBeDefined();
    expect(profileRoute?.canMatch).toBeUndefined();
  });

  it('keeps the standalone /login route protected from authenticated users', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: true,
            accessTokenSnapshot: 'token',
          },
        },
        {
          provide: Router,
          useValue: {
            parseUrl: jasmine.createSpy('parseUrl').and.callFake((url: string) => ({ redirectedTo: url })),
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

    const loginRoute = routes.find((item) => item.path === 'login');
    const guard = loginRoute?.canMatch?.[0] as CanMatchFn;
    const result = TestBed.runInInjectionContext(() => guard?.(loginRoute as never, [])) as unknown as { redirectedTo: string };

    expect(result.redirectedTo).toBe('/tabs/profile');
  });

  it('preserves the legacy /profile redirect to the canonical Profile tab route', () => {
    const route = routes.find((item) => item.path === 'profile');

    expect(route?.redirectTo).toBe('tabs/profile');
  });
});
