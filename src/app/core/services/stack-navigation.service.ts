import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class StackNavigationService {
  private readonly navController = inject(NavController);
  private readonly router = inject(Router);
  private backNavigationPending = false;

  async backWithFallback(fallbackUrl: string): Promise<void> {
    if (this.backNavigationPending) {
      return;
    }

    this.backNavigationPending = true;

    try {
      if (this.hasInAppBackHistory()) {
        await this.navController.back();
        return;
      }

      await this.router.navigateByUrl(fallbackUrl, { replaceUrl: true });
    } finally {
      this.backNavigationPending = false;
    }
  }

  hasInAppBackHistory(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const navigationId = window.history.state?.navigationId;
    return typeof navigationId === 'number' && navigationId > 1;
  }
}
