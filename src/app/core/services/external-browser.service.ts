import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';

@Injectable({ providedIn: 'root' })
export class ExternalBrowserService {
  openUrl(url: string): Promise<void> {
    return Browser.open({ url });
  }
}
