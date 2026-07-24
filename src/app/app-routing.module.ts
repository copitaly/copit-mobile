import { inject, NgModule } from '@angular/core';
import { CanMatchFn, PreloadAllModules, Router, RouterModule, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { FeatureArea, SentryTelemetryService } from './core/services/sentry-telemetry.service';

const normalizeRole = (role: string | null | undefined): string | null =>
  typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : null;

const redirectAuthenticatedAwayFromAuthPages: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentryTelemetry = inject(SentryTelemetryService);

  if (authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot) {
    sentryTelemetry.addFeatureBreadcrumb('auth', 'Route guard redirected authenticated user', {
      route: '/profile',
    });
    return router.parseUrl('/profile');
  }

  return true;
};

const allowAuthenticatedMembersOnly: CanMatchFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sentryTelemetry = inject(SentryTelemetryService);

  const user = authService.currentUserSnapshot;
  const isAuthenticated = authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot;
  const routePath = `/${route.path ?? 'profile/account-settings'}`;
  const feature = (route.data?.['memberFeature'] === 'app' ? 'app' : 'profile') as FeatureArea;
  const unauthenticatedRedirect = String(route.data?.['unauthenticatedRedirect'] ?? '/login');
  const forbiddenRedirect = String(route.data?.['forbiddenRedirect'] ?? '/profile');
  const deniedRoute = routePath === '/my-requests' ? '/prayer/my-requests' : routePath;

  if (!isAuthenticated) {
    sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
      route: deniedRoute,
      reason: 'unauthenticated',
    }, 'warning');
    console.log(`[${feature}] denied reason=unauthenticated`);
    console.log(`[${feature}] guard result`, {
      route: deniedRoute,
      isAuthenticated,
      memberProfileLoaded: false,
      memberProfileId: user?.id ?? null,
      role: user?.role ?? null,
      deniedReason: 'unauthenticated',
      allowed: false,
    });
    return router.parseUrl(unauthenticatedRedirect);
  }

  if (user?.role) {
    const normalizedRole = normalizeRole(user.role);
    const allowed = normalizedRole === 'member';
    const deniedReason = allowed ? null : 'non-member-role';
    if (deniedReason) {
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
        route: deniedRoute,
        reason: deniedReason,
      }, 'warning');
      console.log(`[${feature}] denied reason=${deniedReason}`);
    }
    console.log(`[${feature}] guard result`, {
      route: deniedRoute,
      isAuthenticated,
      memberProfileLoaded: true,
      memberProfileId: user.id ?? null,
      role: normalizedRole,
      deniedReason,
      allowed,
    });
    return allowed ? true : router.parseUrl(forbiddenRedirect);
  }

  console.log(`[${feature}] waiting for role/member profile`);

  return authService.getCurrentUser().pipe(
    map((resolvedProfile) => {
      const normalizedRole = normalizeRole(resolvedProfile?.role);
      const allowed = normalizedRole === 'member';
      if (allowed) {
        sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard allowed member access', {
          route: deniedRoute,
        });
        console.log(`[${feature}] allowed after profile load`);
        console.log(`[${feature}] guard result`, {
          route: deniedRoute,
          isAuthenticated: true,
          memberProfileLoaded: true,
          memberProfileId: resolvedProfile?.id ?? null,
          role: normalizedRole,
          deniedReason: null,
          allowed: true,
        });
        return true;
      }

      const deniedReason = !resolvedProfile ? 'missing-profile' : 'non-member-role';
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard denied member access', {
        route: deniedRoute,
        reason: deniedReason,
      }, 'warning');
      console.log(`[${feature}] denied reason=${deniedReason}`);
      console.log(`[${feature}] guard result`, {
        route: deniedRoute,
        isAuthenticated: true,
        memberProfileLoaded: !!resolvedProfile,
        memberProfileId: resolvedProfile?.id ?? null,
        role: normalizedRole,
        deniedReason,
        allowed: false,
      });
      return router.parseUrl(!resolvedProfile ? unauthenticatedRedirect : forbiddenRedirect);
    }),
    catchError(() => {
      sentryTelemetry.addFeatureBreadcrumb(feature, 'Route guard redirected member access', {
        route: deniedRoute,
        reason: 'profile-load-error',
      }, 'error');
      console.log(`[${feature}] denied reason=profile-load-error`);
      console.log(`[${feature}] guard result`, {
        route: deniedRoute,
        isAuthenticated: true,
        memberProfileLoaded: false,
        memberProfileId: null,
        role: null,
        deniedReason: 'profile-load-error',
        allowed: false,
      });
      return of(router.parseUrl(unauthenticatedRedirect));
    })
  );
};

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/splash/splash.page').then(m => m.SplashPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
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
    canMatch: [redirectAuthenticatedAwayFromAuthPages],
    loadComponent: () => import('./features/auth/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password/:uid/:token',
    loadComponent: () => import('./features/auth/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'profile/account-settings/edit-profile',
    canMatch: [allowAuthenticatedMembersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/profile' },
    loadComponent: () => import('./features/auth/edit-profile.page').then(m => m.EditProfilePage)
  },
  {
    path: 'profile/account-settings/delete-account',
    canMatch: [allowAuthenticatedMembersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/profile' },
    loadComponent: () => import('./features/auth/delete-account.page').then(m => m.DeleteAccountPage)
  },
  {
    path: 'profile/account-settings',
    canMatch: [allowAuthenticatedMembersOnly],
    data: { memberFeature: 'profile', unauthenticatedRedirect: '/login', forbiddenRedirect: '/profile' },
    loadComponent: () => import('./features/auth/account-settings.page').then(m => m.AccountSettingsPage)
  },
  {
    path: 'profile/recurring-donations',
    loadComponent: () => import('./features/donations/recurring-donations.page').then(m => m.RecurringDonationsPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/auth/profile.page').then(m => m.ProfilePage)
  },
  {
    path: 'my-donations',
    loadComponent: () => import('./features/donations/my-donations.page').then(m => m.MyDonationsPage)
  },
  {
    path: 'splash',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'branches',
    loadComponent: () => import('./features/branches/branch-select.page').then(m => m.BranchSelectPage)
  },
  {
    path: 'saved-churches',
    loadComponent: () => import('./features/branches/saved-churches.page').then(m => m.SavedChurchesPage)
  },
  {
    path: 'prayer',
    loadComponent: () => import('./features/prayer/prayer.page').then(m => m.PrayerPage)
  },
  {
    path: 'bible-study',
    loadComponent: () => import('./features/bible-study/bible-study.page').then(m => m.BibleStudyPage)
  },
  {
    path: 'bible-study/:id',
    loadComponent: () => import('./features/bible-study/bible-study-detail.page').then(m => m.BibleStudyDetailPage)
  },
  {
    path: 'prayer/submit',
    loadComponent: () => import('./features/prayer/prayer-submit.page').then(m => m.PrayerSubmitPage)
  },
  {
    path: 'prayer/community',
    loadComponent: () => import('./features/prayer/prayer-community.page').then(m => m.PrayerCommunityPage)
  },
  {
    path: 'prayer/my-requests',
    canMatch: [allowAuthenticatedMembersOnly],
    data: { memberFeature: 'app', unauthenticatedRedirect: '/login', forbiddenRedirect: '/prayer' },
    loadComponent: () => import('./features/prayer/prayer-my-requests.page').then(m => m.PrayerMyRequestsPage)
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
    path: 'donate',
    loadComponent: () => import('./features/donations/donate.page').then(m => m.DonatePage)
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
