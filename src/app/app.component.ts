import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { IonRouterOutlet } from '@ionic/angular';
import { DeepLinkService } from './core/services/deep-link.service';
import { AnalyticsService } from './core/services/analytics.service';
import { HardwareBackCoordinatorService } from './core/services/hardware-back-coordinator.service';
import { StartupSplashService } from './core/services/startup-splash.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements AfterViewInit {
  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet?: IonRouterOutlet;

  constructor(
    private readonly deepLinkService: DeepLinkService,
    private readonly analyticsService: AnalyticsService,
    private readonly hardwareBackCoordinator: HardwareBackCoordinatorService,
    private readonly startupSplash: StartupSplashService
  ) {
    this.startupSplash.markAppBootstrapStarted();
    void this.configureKeyboard();
    void this.analyticsService.trackAppOpened();
  }

  ngAfterViewInit(): void {
    this.hardwareBackCoordinator.initialize(this.routerOutlet);
    this.startupSplash.markAppShellMounted();
  }

  private async configureKeyboard(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    this.startupSplash.markPlatformReady();

    try {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch (error) {
      console.warn('[AppComponent] Unable to set keyboard resize mode.', error);
    }
  }

}
