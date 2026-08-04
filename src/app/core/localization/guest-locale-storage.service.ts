import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

import { resolveSupportedLanguage, SupportedLanguageCode } from '../utils/language-preference';

@Injectable({ providedIn: 'root' })
export class GuestLocaleStorageService {
  static readonly storageKey = 'copit.guest.locale';

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  getGuestLocale(): SupportedLanguageCode | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    try {
      return resolveSupportedLanguage(storage.getItem(GuestLocaleStorageService.storageKey));
    } catch {
      return null;
    }
  }

  setGuestLocale(locale: SupportedLanguageCode): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(GuestLocaleStorageService.storageKey, locale);
    } catch {
      // Ignore storage failures so localization never blocks the app.
    }
  }

  clearGuestLocale(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(GuestLocaleStorageService.storageKey);
    } catch {
      // Ignore storage failures so logout and locale reset stay safe.
    }
  }

  private getStorage(): Storage | null {
    return this.document.defaultView?.localStorage ?? null;
  }
}
