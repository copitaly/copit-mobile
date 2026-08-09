import { TestBed } from '@angular/core/testing';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { of } from 'rxjs';

import { routes } from './app-routing.module';
import { AuthService } from './core/services/auth.service';
import { SentryTelemetryService } from './core/services/sentry-telemetry.service';
import { DevotionalDetailPage } from './features/devotionals/devotional-detail.page';
import { DevotionalsPage } from './features/devotionals/devotionals.page';
import { PrivacyPolicyPage } from './features/legal/privacy-policy.page';
import { PrayerDetailPage } from './features/prayer/prayer-detail.page';
import { TermsAndConditionsPage } from './features/legal/terms-and-conditions.page';

describe('app routes', () => {
  it('registers the canonical devotionals list route inside the tabs shell', async () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const route = tabsRoute?.children?.find((item) => item.path === 'devotionals');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalsPage);
  });

  it('registers the canonical devotional detail route inside the tabs shell', async () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const route = tabsRoute?.children?.find((item) => item.path === 'devotionals/:slug');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalDetailPage);
  });

  it('redirects the legacy devotional detail route to the canonical tabs detail route', () => {
    const route = routes.find((item) => item.path === 'devotionals/:slug');

    expect(route?.redirectTo).toBe('tabs/devotionals/:slug');
  });

  it('registers the canonical prayer detail route inside the tabs shell', async () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const route = tabsRoute?.children?.find((item) => item.path === 'prayer/community/:id');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(PrayerDetailPage);
  });

  it('redirects the legacy prayer detail route to the canonical tabs detail route', () => {
    const route = routes.find((item) => item.path === 'prayer/community/:id');

    expect(route?.redirectTo).toBe('tabs/prayer/community/:id');
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

  it('registers the public Privacy Policy route outside authentication guards', async () => {
    const route = routes.find((item) => item.path === 'privacy-policy');

    expect(route?.canMatch).toBeUndefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(PrivacyPolicyPage);
  });

  it('registers the public Terms & Conditions route outside authentication guards', async () => {
    const route = routes.find((item) => item.path === 'terms-and-conditions');

    expect(route?.canMatch).toBeUndefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(TermsAndConditionsPage);
  });

  it('redirects the legacy /forgot-password route into the embedded Profile recovery state', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            createUrlTree: jasmine
              .createSpy('createUrlTree')
              .and.callFake((commands: unknown[], extras?: { queryParams?: Record<string, string> }) => ({
                commands,
                extras,
              })),
          },
        },
      ],
    }).compileComponents();

    const forgotPasswordRoute = routes.find((item) => item.path === 'forgot-password');
    const guard = forgotPasswordRoute?.canActivate?.[0] as CanActivateFn;
    const result = TestBed.runInInjectionContext(() => guard?.(forgotPasswordRoute as never, {} as never)) as unknown as {
      commands: string[];
      extras?: { queryParams?: Record<string, string> };
    };

    expect(result.commands).toEqual(['/tabs/profile']);
    expect(result.extras?.queryParams).toEqual({ authMode: 'forgot-password' });
  });

  it('allows eligible admin-role users into personal member-app routes', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: true,
            accessTokenSnapshot: 'token',
            currentUserSnapshot: {
              id: 5,
              role: 'branch_admin',
              can_use_member_app: true,
            },
            getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(of({
              id: 5,
              role: 'branch_admin',
              can_use_member_app: true,
            })),
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

    const route = routes.find((item) => item.path === 'my-donations');

    expect(route?.redirectTo).toBe('tabs/profile/my-donations');
  });

  it('keeps delete-account member-only even for eligible admin-role users', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: true,
            accessTokenSnapshot: 'token',
            currentUserSnapshot: {
              id: 6,
              role: 'platform_admin',
              can_use_member_app: true,
            },
            getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(of({
              id: 6,
              role: 'platform_admin',
              can_use_member_app: true,
            })),
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

    const route = routes.find((item) => item.path === 'profile/account-settings/delete-account');
    const guard = route?.canMatch?.[0] as CanMatchFn;
    const result = TestBed.runInInjectionContext(() => guard?.(route as never, [])) as unknown as { redirectedTo: string };

    expect(result.redirectedTo).toBe('/tabs/profile');
  });

  it('allows the Donate tab to render directly without a selected church redirect', () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');
    const donateRoute = tabsRoute?.children?.find((child) => child.path === 'donate');

    expect(donateRoute?.loadComponent).toBeDefined();
    expect(donateRoute?.canActivate).toBeUndefined();
  });

  it('registers donate outcome pages beneath the tabs donate route hierarchy', () => {
    const tabsRoute = routes.find((item) => item.path === 'tabs');

    expect(tabsRoute?.children?.find((child) => child.path === 'donate/success')?.loadComponent).toBeDefined();
    expect(tabsRoute?.children?.find((child) => child.path === 'donate/cancel')?.loadComponent).toBeDefined();
  });

  it('redirects the legacy branches route to the Donate tab', () => {
    const branchesRoute = routes.find((item) => item.path === 'branches');

    expect(branchesRoute?.redirectTo).toBe('tabs/donate');
  });

  it('redirects legacy donate outcome routes to the canonical donate tab outcome routes', () => {
    const successRoute = routes.find((item) => item.path === 'donate/success');
    const cancelRoute = routes.find((item) => item.path === 'donate/cancel');

    expect(successRoute?.redirectTo).toBe('tabs/donate/success');
    expect(cancelRoute?.redirectTo).toBe('tabs/donate/cancel');
  });
});
