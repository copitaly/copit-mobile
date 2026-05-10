import { inject, NgModule } from '@angular/core';
import { CanMatchFn, PreloadAllModules, Router, RouterModule, Routes } from '@angular/router';
import { AuthService } from './core/services/auth.service';

const redirectAuthenticatedAwayFromAuthPages: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticatedSnapshot || !!authService.accessTokenSnapshot) {
    return router.parseUrl('/profile');
  }

  return true;
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
    path: 'profile',
    loadComponent: () => import('./features/auth/profile.page').then(m => m.ProfilePage)
  },
  {
    path: 'profile/recurring-donations',
    loadComponent: () => import('./features/donations/recurring-donations.page').then(m => m.RecurringDonationsPage)
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
