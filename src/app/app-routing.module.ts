import { inject, NgModule } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, CanMatchFn, PreloadAllModules, Router, RouterModule, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environments/environment';
import { canUseMemberApp, hasMemberRole } from './core/auth/member-app-access';
import { AuthService } from './core/services/auth.service';
import { HardwareBackCoordinatorService } from './core/services/hardware-back-coordinator.service';
import { FeatureArea, SentryTelemetryService } from './core/services/sentry-telemetry.service';
import { AUTH_FALLBACK_RETURN_URL, sanitizeAuthReturnUrl } from './features/auth/auth-form.utils';

const logGuardDebug = (...args: unknown[]): void => {
  if (!environment.production) {
    console.log(...args);
  }
};

const redirectAuthenticatedAwayFromAuthPages: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentryTelemetry = inject(SentryTelemetryService);

  if (authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot) {
    sentryTelemetry.addFeatureBreadcrumb('auth', 'Route guard redirected authenticated user', {
      route: '/tabs/profile',
    });
    return router.parseUrl('/tabs/profile');
  }

  return true;
};

const redirectForgotPasswordToProfileTab: CanActivateFn = () =>
  inject(Router).createUrlTree(['/tabs/profile'], {
    queryParams: { authMode: 'forgot-password' },
  });

const redirectUnauthenticatedToLogin = (router: Router, returnUrl: string) =>
  router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: sanitizeAuthReturnUrl(returnUrl, AUTH_FALLBACK_RETURN_URL),
    },
  });

const allowAuthenticatedMemberAppUsersOnly: CanMatchFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentryTelemetry = inject(SentryTelemetryService);

  const user = authService.currentUserSnapshot;
  const isAuthenticated = authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot;
  const routePath = `/${route.path ?? 'profile/account-settings'}`;
  const feature = (route.data?.['memberFeature'] === 'app' ? 'app' : 'profile') as FeatureArea;
  const unauthenticatedRedirect = String(route.data?.['unauthenticatedRedirect'] ?? '/login');
  const unauthenticatedReturnUrl = String(route.data?.['unauthenticatedReturnUrl'] ?? routePath);
  const forbiddenRedirect = String(route.data?.['forbiddenRedirect'] ?? '/tabs/profile');
  const deniedRoute = routePath === '/my-requests' ? '/prayer/my-requests' : routePath;

  if (!isAuthenticated) {
    sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
      route: deniedRoute,
      reason: 'unauthenticated',
    }, 'warning');
    logGuardDebug(`[${feature}] denied reason=unauthenticated`);
    logGuardDebug(`[${feature}] guard result`, {
      route: deniedRoute,
      isAuthenticated,
      memberProfileLoaded: false,
      memberProfileId: user?.id ?? null,
      role: user?.role ?? null,
      deniedReason: 'unauthenticated',
      allowed: false,
    });
    return unauthenticatedRedirect === '/login'
      ? redirectUnauthenticatedToLogin(router, deniedRoute === routePath ? unauthenticatedReturnUrl : deniedRoute)
      : router.parseUrl(unauthenticatedRedirect);
  }

  if (user?.role) {
    const allowed = canUseMemberApp(user);
    const deniedReason = allowed ? null : 'member-app-capability-false';
    if (deniedReason) {
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
        route: deniedRoute,
        reason: deniedReason,
      }, 'warning');
      logGuardDebug(`[${feature}] denied reason=${deniedReason}`);
    }
    logGuardDebug(`[${feature}] guard result`, {
      route: deniedRoute,
      isAuthenticated,
      memberProfileLoaded: true,
      memberProfileId: user.id ?? null,
      role: user.role ?? null,
      canUseMemberApp: user.can_use_member_app ?? null,
      deniedReason,
      allowed,
    });
    return allowed ? true : router.parseUrl(forbiddenRedirect);
  }

  logGuardDebug(`[${feature}] waiting for role/member profile`);

  return authService.getCurrentUser().pipe(
    map((resolvedProfile) => {
      const allowed = canUseMemberApp(resolvedProfile);
      if (allowed) {
        sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard allowed member access', {
          route: deniedRoute,
        });
        logGuardDebug(`[${feature}] allowed after profile load`);
        logGuardDebug(`[${feature}] guard result`, {
          route: deniedRoute,
          isAuthenticated: true,
          memberProfileLoaded: true,
          memberProfileId: resolvedProfile?.id ?? null,
          role: resolvedProfile?.role ?? null,
          canUseMemberApp: resolvedProfile?.can_use_member_app ?? null,
          deniedReason: null,
          allowed: true,
        });
        return true;
      }

      const deniedReason = !resolvedProfile ? 'missing-profile' : 'member-app-capability-false';
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
        route: deniedRoute,
        reason: deniedReason,
      }, 'warning');
      logGuardDebug(`[${feature}] denied reason=${deniedReason}`);
      logGuardDebug(`[${feature}] guard result`, {
        route: deniedRoute,
        isAuthenticated: true,
        memberProfileLoaded: !!resolvedProfile,
        memberProfileId: resolvedProfile?.id ?? null,
        role: resolvedProfile?.role ?? null,
        canUseMemberApp: resolvedProfile?.can_use_member_app ?? null,
        deniedReason,
        allowed: false,
      });
      return !resolvedProfile
        ? unauthenticatedRedirect === '/login'
          ? redirectUnauthenticatedToLogin(router, deniedRoute === routePath ? unauthenticatedReturnUrl : deniedRoute)
          : router.parseUrl(unauthenticatedRedirect)
        : router.parseUrl(forbiddenRedirect);
    }),
    catchError(() => {
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard redirected member access', {
        route: deniedRoute,
        reason: 'profile-load-error',
      }, 'error');
      logGuardDebug(`[${feature}] denied reason=profile-load-error`);
      logGuardDebug(`[${feature}] guard result`, {
        route: deniedRoute,
        isAuthenticated: true,
        memberProfileLoaded: false,
        memberProfileId: null,
        role: null,
        deniedReason: 'profile-load-error',
        allowed: false,
      });
      return of(
        unauthenticatedRedirect === '/login'
          ? redirectUnauthenticatedToLogin(router, deniedRoute === routePath ? unauthenticatedReturnUrl : deniedRoute)
          : router.parseUrl(unauthenticatedRedirect)
      );
    })
  );
};

const allowAuthenticatedMemberRoleOnly: CanMatchFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentryTelemetry = inject(SentryTelemetryService);
  const user = authService.currentUserSnapshot;
  const isAuthenticated = authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot;
  const routePath = `/${route.path ?? 'profile/account-settings/delete-account'}`;

  if (!isAuthenticated) {
    sentryTelemetry.addFeatureBreadcrumb('profile', 'Route guard denied member-only access', {
      route: routePath,
      reason: 'unauthenticated',
    }, 'warning');
    return redirectUnauthenticatedToLogin(router, routePath);
  }

  if (user?.role) {
    return hasMemberRole(user) ? true : router.parseUrl('/tabs/profile');
  }

  return authService.getCurrentUser().pipe(
    map((resolvedProfile) => (hasMemberRole(resolvedProfile) ? true : router.parseUrl('/tabs/profile'))),
    catchError(() => of(router.parseUrl('/tabs/profile')))
  );
};

type UnsavedPrayerRequestPage = {
  form?: { dirty?: boolean };
  showSuccessState?: boolean;
  isSubmitting?: boolean;
};

const blockDirtyPrayerRequestExit: CanDeactivateFn<UnsavedPrayerRequestPage> = (component) => {
  const hardwareBackCoordinator = inject(HardwareBackCoordinatorService);
  const formDirty = component?.form?.dirty === true;
  const showSuccessState = component?.showSuccessState === true;
  const isSubmitting = component?.isSubmitting === true;

  if (!(formDirty && !showSuccessState && !isSubmitting)) {
    return true;
  }

  return hardwareBackCoordinator.confirmUnsavedChangesIfNeeded();
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/splash/splash.page').then(m => m.SplashPage)
  },
  {
    path: 'tabs',
    loadComponent: () => import('./features/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'bible-study',
        loadComponent: () => import('./features/bible-study/bible-study.page').then(m => m.BibleStudyPage)
      },
      {
        path: 'prayer',
        loadComponent: () => import('./features/prayer/prayer.page').then(m => m.PrayerPage)
      },
      {
        path: 'prayer/community',
        loadComponent: () => import('./features/prayer/prayer-community.page').then(m => m.PrayerCommunityPage)
      },
      {
        path: 'prayer/community/:id',
        loadComponent: () => import('./features/prayer/prayer-detail.page').then(m => m.PrayerDetailPage)
      },
      {
        path: 'prayer/submit',
        canDeactivate: [blockDirtyPrayerRequestExit],
        loadComponent: () => import('./features/prayer/prayer-submit.page').then(m => m.PrayerSubmitPage)
      },
      {
        path: 'prayer/my-requests',
        canMatch: [allowAuthenticatedMemberAppUsersOnly],
        data: { memberFeature: 'app', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/prayer' },
        loadComponent: () => import('./features/prayer/prayer-my-requests.page').then(m => m.PrayerMyRequestsPage)
      },
      {
        path: 'devotionals',
        loadComponent: () => import('./features/devotionals/devotionals.page').then(m => m.DevotionalsPage)
      },
      {
        path: 'devotionals/:slug',
        loadComponent: () => import('./features/devotionals/devotional-detail.page').then(m => m.DevotionalDetailPage)
      },
      {
        path: 'donate',
        loadComponent: () => import('./features/donations/donate.page').then(m => m.DonatePage)
      },
      {
        path: 'donate/success',
        loadComponent: () => import('./features/donations/success.page').then(m => m.DonateSuccessPage)
      },
      {
        path: 'donate/cancel',
        loadComponent: () => import('./features/donations/cancel.page').then(m => m.DonateCancelPage)
      },
      {
        path: 'profile/my-donations',
        canMatch: [allowAuthenticatedMemberAppUsersOnly],
        data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
        loadComponent: () => import('./features/donations/my-donations.page').then(m => m.MyDonationsPage)
      },
      {
        path: 'profile/recurring-donations',
        canMatch: [allowAuthenticatedMemberAppUsersOnly],
        data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
        loadComponent: () => import('./features/donations/recurring-donations.page').then(m => m.RecurringDonationsPage)
      },
      {
        path: 'more',
        redirectTo: '/tabs/profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/auth/profile.page').then(m => m.ProfilePage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'home',
    redirectTo: 'tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canMatch: [redirectAuthenticatedAwayFromAuthPages],
    loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    canMatch: [redirectAuthenticatedAwayFromAuthPages],
    loadComponent: () => import('./features/auth/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'forgot-password',
    canActivate: [redirectForgotPasswordToProfileTab],
    loadComponent: () => import('./features/auth/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password/:uid/:token',
    loadComponent: () => import('./features/auth/reset-password.page').then(m => m.ResetPasswordPage)
  },
  ...(!environment.production ? [{
    path: 'auth-layout-debug',
    loadComponent: () => import('./features/auth/auth-layout-debug.page').then(m => m.AuthLayoutDebugPage)
  }] : []),
  {
    path: 'profile/account-settings/edit-profile',
    canMatch: [allowAuthenticatedMemberAppUsersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
    loadComponent: () => import('./features/auth/edit-profile.page').then(m => m.EditProfilePage)
  },
  {
    path: 'profile/account-settings/delete-account',
    canMatch: [allowAuthenticatedMemberRoleOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
    loadComponent: () => import('./features/auth/delete-account.page').then(m => m.DeleteAccountPage)
  },
  {
    path: 'profile/account-settings',
    canMatch: [allowAuthenticatedMemberAppUsersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
    loadComponent: () => import('./features/auth/account-settings.page').then(m => m.AccountSettingsPage)
  },
  {
    path: 'profile/recurring-donations',
    redirectTo: 'tabs/profile/recurring-donations',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    redirectTo: 'tabs/profile',
    pathMatch: 'full'
  },
  {
    path: 'my-donations',
    redirectTo: 'tabs/profile/my-donations',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'branches',
    redirectTo: 'tabs/donate',
    pathMatch: 'full'
  },
  {
    path: 'saved-churches',
    canMatch: [allowAuthenticatedMemberAppUsersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/tabs/profile' },
    loadComponent: () => import('./features/branches/saved-churches.page').then(m => m.SavedChurchesPage)
  },
  {
    path: 'prayer',
    redirectTo: 'tabs/prayer',
    pathMatch: 'full'
  },
  {
    path: 'bible-study',
    redirectTo: 'tabs/bible-study',
    pathMatch: 'full'
  },
  {
    path: 'devotionals',
    redirectTo: 'tabs/devotionals',
    pathMatch: 'full'
  },
  {
    path: 'community',
    redirectTo: 'tabs/prayer/community',
    pathMatch: 'full'
  },
  {
    path: 'donate',
    redirectTo: 'tabs/donate',
    pathMatch: 'full'
  },
  {
    path: 'devotionals/:slug',
    redirectTo: 'tabs/devotionals/:slug',
    pathMatch: 'full'
  },
  {
    path: 'bible-study/:id/read',
    loadComponent: () => import('./features/bible-study/bible-study-reader.page').then(m => m.BibleStudyReaderPage)
  },
  {
    path: 'bible-study/:id',
    redirectTo: 'bible-study/:id/read',
    pathMatch: 'full'
  },
  {
    path: 'prayer/submit',
    redirectTo: 'tabs/prayer/submit',
    pathMatch: 'full'
  },
  {
    path: 'prayer/community',
    redirectTo: 'tabs/prayer/community',
    pathMatch: 'full'
  },
  {
    path: 'prayer/community/:id',
    redirectTo: 'tabs/prayer/community/:id',
    pathMatch: 'full'
  },
  {
    path: 'prayer/my-requests',
    redirectTo: 'tabs/prayer/my-requests',
    pathMatch: 'full'
  },
  {
    path: 'donate/success',
    redirectTo: 'tabs/donate/success',
    pathMatch: 'full'
  },
  {
    path: 'donate/cancel',
    redirectTo: 'tabs/donate/cancel',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
