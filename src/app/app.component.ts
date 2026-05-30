import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { environment } from 'src/environments/environment';
import { DeepLinkService } from './core/services/deep-link.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  readonly showPreproductionLabel = this.shouldShowPreproductionLabel();

  constructor(private readonly deepLinkService: DeepLinkService) {
    console.log('[AppComponent] rendered at', new Date().toISOString());
    void this.configureKeyboard();
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

  private shouldShowPreproductionLabel(): boolean {
    if (!environment.production) {
      return false;
    }

    const apiBaseUrl = (environment.apiBaseUrl ?? '').toLowerCase();
    const appOrigin = (environment.appOrigin ?? '').toLowerCase();
    const stripePublishableKey = (environment.stripePublishableKey ?? '').trim().toLowerCase();

    return (
      apiBaseUrl.includes('staging') ||
      appOrigin.includes('staging') ||
      stripePublishableKey.startsWith('pk_test')
    );
  }
}
