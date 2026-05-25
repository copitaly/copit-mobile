import { inject, NgModule } from '@angular/core';
import { CanMatchFn, PreloadAllModules, Router, RouterModule, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';

const redirectAuthenticatedAwayFromAuthPages: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot) {
    return router.parseUrl('/profile');
  }

  return true;
};

const allowAuthenticatedMembersIntoAccountSettings: CanMatchFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUserSnapshot;
  const isAuthenticated = authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot;
  const routePath = `/${route.path ?? 'profile/account-settings'}`;

  if (!isAuthenticated) {
    console.log('[account-settings] denied reason=unauthenticated');
    console.log('[account-settings] guard result', {
      route: routePath,
      isAuthenticated,
      memberProfileLoaded: false,
      memberProfileId: user?.id ?? null,
      role: user?.role ?? null,
      deniedReason: 'unauthenticated',
      allowed: false,
    });
    return router.parseUrl('/login');
  }

  if (user?.role) {
    const allowed = user.role === 'member';
    const deniedReason = allowed ? null : 'non-member-role';
    if (deniedReason) {
      console.log('[account-settings] denied reason=' + deniedReason);
    }
    console.log('[account-settings] guard result', {
      route: routePath,
      isAuthenticated,
      memberProfileLoaded: true,
      memberProfileId: user.id ?? null,
      role: user.role,
      deniedReason,
      allowed,
    });
    return allowed ? true : router.parseUrl('/profile');
  }

  console.log('[account-settings] waiting for role/member profile');

  return authService.getCurrentUser().pipe(
    map((resolvedProfile) => {
      const allowed = !!resolvedProfile?.id;
      if (allowed) {
        console.log('[account-settings] allowed after profile load');
        console.log('[account-settings] guard result', {
          route: routePath,
          isAuthenticated: true,
          memberProfileLoaded: true,
          memberProfileId: resolvedProfile?.id ?? null,
          role: resolvedProfile?.role ?? null,
          deniedReason: null,
          allowed: true,
        });
        return true;
      }

      const deniedReason = !resolvedProfile ? 'missing-profile' : 'non-member-profile';
      console.log('[account-settings] denied reason=' + deniedReason);
      console.log('[account-settings] guard result', {
        route: routePath,
        isAuthenticated: true,
        memberProfileLoaded: !!resolvedProfile,
        memberProfileId: resolvedProfile?.id ?? null,
        role: resolvedProfile?.role ?? null,
        deniedReason,
        allowed: false,
      });
      return router.parseUrl(!resolvedProfile ? '/login' : '/profile');
    }),
    catchError(() => {
      console.log('[account-settings] denied reason=profile-load-error');
      console.log('[account-settings] guard result', {
        route: routePath,
        isAuthenticated: true,
        memberProfileLoaded: false,
        memberProfileId: null,
        role: null,
        deniedReason: 'profile-load-error',
        allowed: false,
      });
      return of(router.parseUrl('/login'));
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
    path: 'profile/account-settings',
    canMatch: [allowAuthenticatedMembersIntoAccountSettings],
    loadComponent: () => import('./features/auth/account-settings.page').then(m => m.AccountSettingsPage)
  },
  {
    path: 'profile/account-settings/delete-account',
    canMatch: [allowAuthenticatedMembersIntoAccountSettings],
    loadComponent: () => import('./features/auth/delete-account.page').then(m => m.DeleteAccountPage)
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
