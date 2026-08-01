import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { filter } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StartupSplashService {
  private static readonly FAILSAFE_HIDE_MS = 12000;

  private readonly router = inject(Router);

  private appBootstrapped = false;
  private splashRouteActive = false;
  private splashPaintReady = false;
  private hideRequested = false;
  private hideCompleted = false;
  private failsafeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.log('initial route completion', event.urlAfterRedirects);
        this.splashRouteActive = this.isSplashUrl(event.urlAfterRedirects);
        this.tryHideNativeSplash('route-navigation-end');
      });
  }

  markAppBootstrapStarted(): void {
    this.log('app bootstrap');
    this.startFailsafeHideTimer();
  }

  markPlatformReady(): void {
    this.log('Platform.ready');
  }

  markAppShellMounted(): void {
    this.appBootstrapped = true;
    this.log('ion-app mounted');
    this.tryHideNativeSplash('app-shell-mounted');
  }

  markBrandedSplashMounted(): void {
    this.splashRouteActive = true;
    this.log('branded splash component mount');
    this.tryHideNativeSplash('splash-mounted');
  }

  markBrandedSplashPaintReady(): void {
    this.splashPaintReady = true;
    this.log('first paint readiness');
    this.tryHideNativeSplash('splash-paint-ready');
  }

  private isSplashUrl(url: string): boolean {
    const normalized = (url || '').split('?')[0].split('#')[0];
    return normalized === '' || normalized === '/' || normalized === '/splash';
  }

  private async tryHideNativeSplash(reason: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.hideRequested || this.hideCompleted) {
      return;
    }

    if (!this.appBootstrapped || !this.splashRouteActive || !this.splashPaintReady) {
      return;
    }

    this.hideRequested = true;
    this.clearFailsafeHideTimer();
    this.log('native SplashScreen.hide call', reason);

    try {
      await SplashScreen.hide();
    } catch (error) {
      this.log('native SplashScreen.hide failed', error);
    } finally {
      this.hideCompleted = true;
    }
  }

  private startFailsafeHideTimer(): void {
    if (!Capacitor.isNativePlatform() || this.failsafeTimer) {
      return;
    }

    this.failsafeTimer = setTimeout(() => {
      void this.forceHideNativeSplash('failsafe-timeout');
    }, StartupSplashService.FAILSAFE_HIDE_MS);
  }

  private clearFailsafeHideTimer(): void {
    if (!this.failsafeTimer) {
      return;
    }

    clearTimeout(this.failsafeTimer);
    this.failsafeTimer = undefined;
  }

  private async forceHideNativeSplash(reason: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.hideCompleted || this.hideRequested) {
      return;
    }

    this.hideRequested = true;
    this.log('native SplashScreen.hide call', reason);

    try {
      await SplashScreen.hide();
    } catch (error) {
      this.log('native SplashScreen.hide failed', error);
    } finally {
      this.hideCompleted = true;
      this.clearFailsafeHideTimer();
    }
  }

  private log(event: string, detail?: unknown): void {
    if (environment.production) {
      return;
    }

    if (detail === undefined) {
      console.log(`[StartupSplash] ${event}`, new Date().toISOString());
      return;
    }

    console.log(`[StartupSplash] ${event}`, new Date().toISOString(), detail);
  }
}
