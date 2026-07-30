import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

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

  it('redirects unauthenticated /tabs/profile access to login with a profile return URL', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: false,
            accessTokenSnapshot: null,
          },
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: jasmine.createSpy('createUrlTree').and.callFake((commands: unknown[], extras?: { queryParams?: Record<string, string> }) =>
              ({ commands, queryParams: extras?.queryParams } as unknown as UrlTree)
            ),
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

    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const profileRoute = tabsRoute?.children?.find((child) => child.path === 'profile');
    const guard = profileRoute?.canMatch?.[0] as CanMatchFn;
    const result = TestBed.runInInjectionContext(() => guard?.(profileRoute as never, []));

    const redirect = result as unknown as { commands: string[]; queryParams: Record<string, string> };
    expect(redirect.commands).toEqual(['/login']);
    expect(redirect.queryParams).toEqual({ returnUrl: '/tabs/profile' });
  });

  it('allows authenticated /tabs/profile access normally', async () => {
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
            createUrlTree: jasmine.createSpy('createUrlTree'),
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

    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const profileRoute = tabsRoute?.children?.find((child) => child.path === 'profile');
    const guard = profileRoute?.canMatch?.[0] as CanMatchFn;
    const result = TestBed.runInInjectionContext(() => guard?.(profileRoute as never, []));

    expect(result).toBeTrue();
  });
});
