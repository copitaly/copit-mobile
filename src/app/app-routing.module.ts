import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

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
    loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/auth/profile.page').then(m => m.ProfilePage)
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
