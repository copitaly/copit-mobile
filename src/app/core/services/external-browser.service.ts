import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

@Injectable({ providedIn: 'root' })
export class ExternalBrowserService {
  async openUrl(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
