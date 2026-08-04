import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import itTranslations from './locales/it.json';
import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  resolveSupportedLanguage,
  SUPPORTED_LANGUAGE_OPTIONS,
  SupportedLanguageCode,
} from '../utils/language-preference';
import { GuestLocaleStorageService } from './guest-locale-storage.service';
import { environment } from '../../../environments/environment';

type TranslationLeaf = string;
type TranslationTree = {
  [key: string]: TranslationLeaf | TranslationTree;
};

type LocaleSource = 'startup' | 'guest' | 'authenticated' | 'logout' | 'runtime';

export interface SetLocaleOptions {
  persistGuest?: boolean;
  source?: LocaleSource;
}

export type TranslationParams = Record<string, string | number | null | undefined>;

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly resources: Record<SupportedLanguageCode, TranslationTree> = {
    en: enTranslations as TranslationTree,
    it: itTranslations as TranslationTree,
    fr: frTranslations as TranslationTree,
  };

  private readonly localeSubject = new BehaviorSubject<SupportedLanguageCode>(DEFAULT_LANGUAGE);
  private readonly activeMessagesSubject = new BehaviorSubject<TranslationTree>(this.resources[DEFAULT_LANGUAGE]);
  private readonly warnedMissingKeys = new Set<string>();

  private initialized = false;
  private runtimeApplied = false;
  private lastAppliedSource: LocaleSource = 'startup';

  readonly locale$: Observable<SupportedLanguageCode> = this.localeSubject.asObservable();

  constructor(
    private readonly guestLocaleStorage: GuestLocaleStorageService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const guestLocale = this.guestLocaleStorage.getGuestLocale();
      const deviceLocale = this.resolveDeviceLocale();
      const startupLocale = guestLocale ?? deviceLocale ?? DEFAULT_LANGUAGE;
      await this.setLocale(startupLocale, { persistGuest: false, source: 'startup' });
    } catch {
      await this.setLocale(DEFAULT_LANGUAGE, { persistGuest: false, source: 'startup' });
    } finally {
      this.initialized = true;
    }
  }

  async setLocale(locale: unknown, options?: SetLocaleOptions): Promise<SupportedLanguageCode> {
    const resolvedLocale = resolveSupportedLanguage(locale) ?? FALLBACK_LANGUAGE;
    const persistGuest = options?.persistGuest ?? false;
    const source = options?.source ?? 'runtime';

    if (this.localeSubject.value === resolvedLocale && this.runtimeApplied) {
      if (persistGuest) {
        this.guestLocaleStorage.setGuestLocale(resolvedLocale);
      }
      this.lastAppliedSource = source;
      return resolvedLocale;
    }

    this.applyTranslationRuntime(resolvedLocale, source);
    if (persistGuest) {
      this.guestLocaleStorage.setGuestLocale(resolvedLocale);
    }
    return resolvedLocale;
  }

  async applyAuthenticatedPreference(language: unknown): Promise<SupportedLanguageCode> {
    return this.setLocale(language, { persistGuest: false, source: 'authenticated' });
  }

  // Logout restores the guest/device resolution path and does not persist the
  // former authenticated profile language as a guest preference.
  async handleLogout(): Promise<SupportedLanguageCode> {
    const guestLocale = this.guestLocaleStorage.getGuestLocale();
    const deviceLocale = this.resolveDeviceLocale();
    return this.setLocale(guestLocale ?? deviceLocale ?? DEFAULT_LANGUAGE, {
      persistGuest: false,
      source: 'logout',
    });
  }

  getCurrentLocale(): SupportedLanguageCode {
    return this.localeSubject.value;
  }

  getSupportedLanguages(): ReadonlyArray<{ value: SupportedLanguageCode; label: string }> {
    return SUPPORTED_LANGUAGE_OPTIONS;
  }

  getCurrentMessages(): TranslationTree {
    return this.activeMessagesSubject.value;
  }

  getLastAppliedSource(): LocaleSource {
    return this.lastAppliedSource;
  }

  translate(key: string, params?: TranslationParams): string {
    const currentMessages = this.activeMessagesSubject.value;
    const currentValue = this.getNestedValue(currentMessages, key);
    if (typeof currentValue === 'string') {
      return this.interpolate(currentValue, params);
    }

    const fallbackValue = this.getNestedValue(this.resources[FALLBACK_LANGUAGE], key);
    if (typeof fallbackValue === 'string') {
      this.warnMissingKey(key, this.localeSubject.value);
      return this.interpolate(fallbackValue, params);
    }

    this.warnMissingKey(key, this.localeSubject.value);
    return environment.production ? '' : key;
  }

  private applyTranslationRuntime(locale: SupportedLanguageCode, source: LocaleSource): void {
    this.localeSubject.next(locale);
    this.activeMessagesSubject.next(this.resources[locale] ?? this.resources[FALLBACK_LANGUAGE]);
    this.document.documentElement.lang = locale;
    this.document.documentElement.setAttribute('data-app-locale', locale);
    this.runtimeApplied = true;
    this.lastAppliedSource = source;
  }

  private resolveDeviceLocale(): SupportedLanguageCode | null {
    const navigatorRef = this.document.defaultView?.navigator;
    if (!navigatorRef) {
      return null;
    }

    const candidates = Array.isArray(navigatorRef.languages) && navigatorRef.languages.length
      ? navigatorRef.languages
      : [navigatorRef.language];

    for (const candidate of candidates) {
      const resolved = resolveSupportedLanguage(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  private getNestedValue(tree: TranslationTree, path: string): TranslationLeaf | TranslationTree | undefined {
    return path.split('.').reduce<TranslationLeaf | TranslationTree | undefined>((current, segment) => {
      if (!current || typeof current === 'string' || !(segment in current)) {
        return undefined;
      }
      return current[segment];
    }, tree);
  }

  private warnMissingKey(key: string, locale: SupportedLanguageCode): void {
    if (environment.production) {
      return;
    }

    const warningKey = `${locale}:${key}`;
    if (this.warnedMissingKeys.has(warningKey)) {
      return;
    }

    this.warnedMissingKeys.add(warningKey);
    console.warn(`[LocaleService] Missing translation for "${key}" in locale "${locale}".`);
  }

  private interpolate(template: string, params?: TranslationParams): string {
    if (!params) {
      return template;
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token: string) => {
      const value = params[token];
      return value === null || value === undefined ? '' : String(value);
    });
  }
}
