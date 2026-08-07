import { Injectable, OnDestroy } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonRouterOutlet,
  ModalController,
  Platform,
  PopoverController,
} from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AUTH_FALLBACK_RETURN_URL, sanitizeAuthReturnUrl } from '../../features/auth/auth-form.utils';
import { AppToastService } from './app-toast.service';
import { OverlayDiagnosticsService } from './overlay-diagnostics.service';

interface ProgressiveSelectorBackHandler {
  isOpen: () => boolean;
  handleBack: () => Promise<boolean> | boolean;
}

interface UnsavedChangesBackHandler {
  isDirty: () => boolean;
  onDiscard?: () => Promise<void> | void;
}

const HOME_TAB_ROUTE = '/tabs/home';
const EXIT_CONFIRMATION_WINDOW_MS = 2000;

@Injectable({ providedIn: 'root' })
export class HardwareBackCoordinatorService implements OnDestroy {
  private routerOutlet?: IonRouterOutlet;
  private backButtonSubscription?: Subscription;
  private navigatePending = false;
  private handlingBack = false;
  private exitArmedUntil = 0;
  private readonly selectorHandlers = new Map<symbol, ProgressiveSelectorBackHandler>();
  private readonly unsavedHandlers = new Map<symbol, UnsavedChangesBackHandler>();

  constructor(
    private readonly platform: Platform,
    private readonly router: Router,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly actionSheetController: ActionSheetController,
    private readonly popoverController: PopoverController,
    private readonly appToast: AppToastService,
    private readonly overlayDiagnostics: OverlayDiagnosticsService
  ) {}

  initialize(routerOutlet?: IonRouterOutlet): void {
    if (routerOutlet) {
      this.routerOutlet = routerOutlet;
    }

    if (!this.isNativeAndroid() || this.backButtonSubscription) {
      return;
    }

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      void this.handleHardwareBack();
    });
  }

  registerSelectorHandler(handler: ProgressiveSelectorBackHandler): () => void {
    const token = Symbol('selector-back-handler');
    this.selectorHandlers.set(token, handler);
    return () => {
      this.selectorHandlers.delete(token);
    };
  }

  registerUnsavedChangesHandler(handler: UnsavedChangesBackHandler): () => void {
    const token = Symbol('unsaved-changes-handler');
    this.unsavedHandlers.set(token, handler);
    return () => {
      this.unsavedHandlers.delete(token);
    };
  }

  async handleHardwareBack(): Promise<void> {
    if (!this.isNativeAndroid() || this.handlingBack) {
      return;
    }

    this.handlingBack = true;

    try {
      if (await this.dismissAlertOverlay()) {
        return;
      }

      if (await this.dismissActionSheetOverlay()) {
        return;
      }

      if (await this.dismissPopoverOverlay()) {
        return;
      }

      if (await this.handleProgressiveSelectorBack()) {
        return;
      }

      if (await this.dismissModalOverlay()) {
        return;
      }

      if (await this.handleUnsavedChanges()) {
        return;
      }

      if (this.routerOutlet?.canGoBack()) {
        await this.routerOutlet.pop();
        this.resetExitWindow();
        return;
      }

      const currentUrl = this.getNormalizedUrl();

      if (this.isNonHomeTopLevelTab(currentUrl)) {
        await this.navigateByUrl(HOME_TAB_ROUTE);
        return;
      }

      const fallbackRoute = this.resolveFallbackRoute(currentUrl);
      if (fallbackRoute && fallbackRoute !== currentUrl) {
        await this.navigateByUrl(fallbackRoute);
        return;
      }

      if (this.isHomeTopLevelTab(currentUrl)) {
        await this.handleHomeExitBackPress();
        return;
      }

      await this.navigateByUrl(HOME_TAB_ROUTE);
    } finally {
      this.handlingBack = false;
    }
  }

  ngOnDestroy(): void {
    this.backButtonSubscription?.unsubscribe();
  }

  async confirmUnsavedChangesIfNeeded(): Promise<boolean> {
    const activeHandler = [...this.unsavedHandlers.values()].reverse().find((handler) => handler.isDirty());
    if (!activeHandler) {
      return true;
    }

    const shouldDiscard = await this.confirmDiscardChanges();
    if (!shouldDiscard) {
      return false;
    }

    await activeHandler.onDiscard?.();
    return true;
  }

  private async dismissAlertOverlay(): Promise<boolean> {
    const alert = await this.alertController.getTop();
    if (!alert) {
      return false;
    }

    this.overlayDiagnostics.capture('hardware-back.dismiss-alert');
    await alert.dismiss();
    return true;
  }

  private async dismissActionSheetOverlay(): Promise<boolean> {
    const actionSheet = await this.actionSheetController.getTop();
    if (!actionSheet) {
      return false;
    }

    this.overlayDiagnostics.capture('hardware-back.dismiss-action-sheet');
    await actionSheet.dismiss();
    return true;
  }

  private async dismissPopoverOverlay(): Promise<boolean> {
    const popover = await this.popoverController.getTop();
    if (!popover) {
      return false;
    }

    this.overlayDiagnostics.capture('hardware-back.dismiss-popover');
    await popover.dismiss();
    return true;
  }

  private async dismissModalOverlay(): Promise<boolean> {
    const modal = await this.modalController.getTop();
    if (!modal) {
      return false;
    }

    this.overlayDiagnostics.capture('hardware-back.dismiss-modal');
    await modal.dismiss();
    return true;
  }

  private async handleProgressiveSelectorBack(): Promise<boolean> {
    const activeHandler = [...this.selectorHandlers.values()].reverse().find((handler) => handler.isOpen());
    if (!activeHandler) {
      return false;
    }

    this.overlayDiagnostics.capture('hardware-back.dismiss-selector');
    return !!(await activeHandler.handleBack());
  }

  private async handleUnsavedChanges(): Promise<boolean> {
    const canContinue = await this.confirmUnsavedChangesIfNeeded();
    if (!canContinue) {
      return true;
    }
    return false;
  }

  private async confirmDiscardChanges(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Discard changes?',
      message: 'You have unsaved changes. Discard them and leave this page?',
      buttons: [
        { text: 'Keep editing', role: 'cancel' },
        { text: 'Discard', role: 'destructive' },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'destructive';
  }

  private async handleHomeExitBackPress(): Promise<void> {
    const now = Date.now();
    if (now <= this.exitArmedUntil) {
      this.resetExitWindow();
      App.exitApp();
      return;
    }

    this.exitArmedUntil = now + EXIT_CONFIRMATION_WINDOW_MS;
    await this.appToast.info('Press back again to exit', { duration: EXIT_CONFIRMATION_WINDOW_MS });
  }

  private async navigateByUrl(url: string): Promise<void> {
    if (this.navigatePending) {
      return;
    }

    this.navigatePending = true;
    try {
      this.resetExitWindow();
      await this.router.navigateByUrl(url, { replaceUrl: true });
    } finally {
      this.navigatePending = false;
    }
  }

  private resetExitWindow(): void {
    this.exitArmedUntil = 0;
  }

  private getNormalizedUrl(): string {
    const rawUrl = this.router.url || '';
    return rawUrl.split('?')[0].split('#')[0] || '/';
  }

  private resolveFallbackRoute(currentUrl: string): string | null {
    if (currentUrl === '/login') {
      return this.resolveLoginFallbackRoute();
    }

    if (currentUrl === '/register' || currentUrl === '/forgot-password') {
      return '/login';
    }

    if (currentUrl.startsWith('/reset-password/')) {
      return '/login';
    }

    if (currentUrl === '/profile/account-settings/delete-account') {
      return '/profile/account-settings';
    }

    if (
      currentUrl === '/profile/account-settings/edit-profile' ||
      currentUrl === '/profile/account-settings' ||
      currentUrl === '/saved-churches' ||
      currentUrl === '/my-donations' ||
      currentUrl === '/profile/recurring-donations' ||
      currentUrl === '/tabs/profile/my-donations' ||
      currentUrl === '/tabs/profile/recurring-donations'
    ) {
      return '/tabs/profile';
    }

    if (
      currentUrl === '/tabs/donate/success' ||
      currentUrl === '/tabs/donate/cancel' ||
      currentUrl === '/donate/success' ||
      currentUrl === '/donate/cancel'
    ) {
      return '/tabs/donate';
    }

    if (currentUrl === '/tabs/prayer' || currentUrl === '/prayer') {
      return '/tabs/home';
    }

    if (
      currentUrl === '/tabs/prayer/community' ||
      currentUrl === '/tabs/prayer/submit' ||
      currentUrl === '/tabs/prayer/my-requests' ||
      currentUrl === '/prayer/submit' ||
      currentUrl === '/community' ||
      currentUrl === '/prayer/my-requests'
    ) {
      return '/tabs/prayer';
    }

    if (currentUrl.startsWith('/bible-study/')) {
      return '/tabs/bible-study';
    }

    if (
      currentUrl.startsWith('/tabs/devotionals/') ||
      (currentUrl.startsWith('/devotionals/') && currentUrl !== '/devotionals')
    ) {
      return '/tabs/devotionals';
    }

    return null;
  }

  private resolveLoginFallbackRoute(): string {
    const parsedUrl = this.router.parseUrl(this.router.url || '/login');
    const returnUrl = typeof parsedUrl.queryParams['returnUrl'] === 'string' ? parsedUrl.queryParams['returnUrl'] : null;
    return sanitizeAuthReturnUrl(returnUrl, '/tabs/profile') || AUTH_FALLBACK_RETURN_URL;
  }

  private isHomeTopLevelTab(currentUrl: string): boolean {
    return currentUrl === HOME_TAB_ROUTE;
  }

  private isNonHomeTopLevelTab(currentUrl: string): boolean {
    return currentUrl === '/tabs/bible-study'
      || currentUrl === '/tabs/devotionals'
      || currentUrl === '/tabs/donate'
      || currentUrl === '/tabs/profile';
  }

  private isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }
}
