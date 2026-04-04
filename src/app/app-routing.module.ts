import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'home',
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
