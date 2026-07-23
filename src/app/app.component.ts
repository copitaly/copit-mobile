import { Component, OnDestroy, ViewChild } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import {
  ActionSheetController,
  AlertController,
  IonRouterOutlet,
  ModalController,
  Platform,
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DeepLinkService } from './core/services/deep-link.service';
import { AnalyticsService } from './core/services/analytics.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet?: IonRouterOutlet;

  private backButtonSubscription?: Subscription;

  constructor(
    private readonly deepLinkService: DeepLinkService,
    private readonly analyticsService: AnalyticsService,
    private readonly platform: Platform,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly actionSheetController: ActionSheetController
  ) {
    console.log('[AppComponent] rendered at', new Date().toISOString());
    void this.configureKeyboard();
    this.registerAndroidBackButtonHandler();
    void this.analyticsService.trackAppOpened();
  }

  ngOnDestroy(): void {
    this.backButtonSubscription?.unsubscribe();
  }

  private async configureKeyboard(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch (error) {
      console.warn('[AppComponent] Unable to set keyboard resize mode.', error);
    }
  }

  private registerAndroidBackButtonHandler(): void {
    if (!this.isNativeAndroid() || this.backButtonSubscription) {
      return;
    }

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(-1, async () => {
      await this.handleAndroidBackButton();
    });
  }

  private async handleAndroidBackButton(): Promise<void> {
    if (!this.isNativeAndroid()) {
      return;
    }

    if (await this.dismissTopOverlay()) {
      return;
    }

    if (this.routerOutlet?.canGoBack()) {
      void this.routerOutlet.pop();
      return;
    }

    this.exitNativeApp();
  }

  private async dismissTopOverlay(): Promise<boolean> {
    const modal = await this.modalController.getTop();
    if (modal) {
      await modal.dismiss();
      return true;
    }

    const alert = await this.alertController.getTop();
    if (alert) {
      await alert.dismiss();
      return true;
    }

    const actionSheet = await this.actionSheetController.getTop();
    if (actionSheet) {
      await actionSheet.dismiss();
      return true;
    }

    return false;
  }

  private isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  private exitNativeApp(): void {
    App.exitApp();
  }
}
