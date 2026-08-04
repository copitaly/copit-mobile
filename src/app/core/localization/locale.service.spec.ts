import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import itTranslations from './locales/it.json';
import { GuestLocaleStorageService } from './guest-locale-storage.service';
import { LocaleService } from './locale.service';

class MockGuestLocaleStorageService {
  getGuestLocale = jasmine.createSpy().and.returnValue(null);
  setGuestLocale = jasmine.createSpy();
  clearGuestLocale = jasmine.createSpy();
}

describe('LocaleService', () => {
  let service: LocaleService;
  let documentRef: Document;
  let guestStorage: MockGuestLocaleStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        { provide: GuestLocaleStorageService, useClass: MockGuestLocaleStorageService },
      ],
    });

    service = TestBed.inject(LocaleService);
    documentRef = TestBed.inject(DOCUMENT);
    guestStorage = TestBed.inject(GuestLocaleStorageService) as unknown as MockGuestLocaleStorageService;
  });

  function setNavigatorLanguages(languages: string[], language = languages[0] ?? 'en-US'): void {
    Object.defineProperty(documentRef.defaultView?.navigator, 'languages', {
      configurable: true,
      get: () => languages,
    });
    Object.defineProperty(documentRef.defaultView?.navigator, 'language', {
      configurable: true,
      get: () => language,
    });
  }

  function flattenKeys(value: unknown, prefix = ''): string[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    return Object.entries(value as Record<string, unknown>).reduce<string[]>((keys, entry) => {
      const [key, nestedValue] = entry;
      const nestedPath = prefix ? `${prefix}.${key}` : key;
      if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
        return keys.concat(flattenKeys(nestedValue, nestedPath));
      }
      return keys.concat(nestedPath);
    }, []);
  }

  it('uses stored guest preference before device language', async () => {
    guestStorage.getGuestLocale.and.returnValue('fr');
    setNavigatorLanguages(['it-IT']);

    await service.initialize();

    expect(service.getCurrentLocale()).toBe('fr');
    expect(documentRef.documentElement.lang).toBe('fr');
  });

  it('uses a supported device language when no stored preference exists', async () => {
    setNavigatorLanguages(['it-IT']);

    await service.initialize();

    expect(service.getCurrentLocale()).toBe('it');
  });

  it('skips unsupported device languages and falls back to a later supported one', async () => {
    setNavigatorLanguages(['es-ES', 'fr-CA']);

    await service.initialize();

    expect(service.getCurrentLocale()).toBe('fr');
  });

  it('falls back to en when device language is unsupported', async () => {
    setNavigatorLanguages(['es-ES']);

    await service.initialize();

    expect(service.getCurrentLocale()).toBe('en');
  });

  it('falls back safely when stored preference is malformed', async () => {
    guestStorage.getGuestLocale.and.returnValue(null);
    setNavigatorLanguages(['de-DE']);

    await service.initialize();

    expect(service.getCurrentLocale()).toBe('en');
  });

  it('initializer always completes and falls back to en when guest storage fails', async () => {
    guestStorage.getGuestLocale.and.throwError('storage failed');
    setNavigatorLanguages(['it-IT']);

    await expectAsync(service.initialize()).toBeResolved();
    expect(service.getCurrentLocale()).toBe('en');
  });

  it('supports immediate runtime locale switching and guest persistence', async () => {
    await service.initialize();

    await service.setLocale('it', { persistGuest: true, source: 'guest' });

    expect(service.getCurrentLocale()).toBe('it');
    expect(guestStorage.setGuestLocale).toHaveBeenCalledWith('it');
    expect(service.translate('common.retry')).toBe('Riprova');
  });

  it('applies authenticated profile preference without persisting it as a guest choice', async () => {
    await service.initialize();

    await service.applyAuthenticatedPreference('fr');

    expect(service.getCurrentLocale()).toBe('fr');
    expect(guestStorage.setGuestLocale).not.toHaveBeenCalled();
    expect(service.getLastAppliedSource()).toBe('authenticated');
  });

  it('does not trigger unnecessary reapplication when the locale is unchanged', async () => {
    await service.initialize();
    const emissions: string[] = [];
    const subscription = service.locale$.subscribe((locale) => emissions.push(locale));

    await service.setLocale('en', { persistGuest: false, source: 'runtime' });
    await service.setLocale('en', { persistGuest: false, source: 'runtime' });

    subscription.unsubscribe();
    expect(emissions).toEqual(['en']);
  });

  it('restores the guest preference on logout instead of persisting the former authenticated locale', async () => {
    guestStorage.getGuestLocale.and.returnValue('it');
    setNavigatorLanguages(['fr-FR']);
    await service.initialize();
    await service.applyAuthenticatedPreference('fr');

    await service.handleLogout();

    expect(service.getCurrentLocale()).toBe('it');
    expect(guestStorage.setGuestLocale).not.toHaveBeenCalledWith('fr');
    expect(service.getLastAppliedSource()).toBe('logout');
  });

  it('loads en, it, and fr resources with identical key sets', () => {
    const enKeys = flattenKeys(enTranslations).sort();
    const itKeys = flattenKeys(itTranslations).sort();
    const frKeys = flattenKeys(frTranslations).sort();

    expect(enKeys).toEqual(itKeys);
    expect(enKeys).toEqual(frKeys);
  });

  it('exposes the canonical Bible Study, Devotions, and Community terminology in Italian and French', async () => {
    await service.initialize();

    await service.setLocale('it', { persistGuest: false, source: 'runtime' });
    expect(service.translate('bibleStudy.title')).toBe('Studio biblico');
    expect(service.translate('home.featuredEyebrow')).toBe('Ultimo studio biblico');
    expect(service.translate('devotions.title')).toBe('Devozioni');
    expect(service.translate('home.dailyFallbackTitle')).toBe('Devozione di oggi');
    expect(service.translate('home.communityLabel')).toBe('Comunità');

    await service.setLocale('fr', { persistGuest: false, source: 'runtime' });
    expect(service.translate('bibleStudy.title')).toBe('Étude biblique');
    expect(service.translate('home.featuredEyebrow')).toBe('Dernière étude biblique');
    expect(service.translate('devotions.title')).toBe('Dévotions');
    expect(service.translate('home.dailyFallbackTitle')).toBe('Dévotion du jour');
    expect(service.translate('home.communityLabel')).toBe('Communauté');
  });

  it('exposes localized splash branding and tagline keys', async () => {
    await service.initialize();

    expect(service.translate('app.name')).toBe('COP Italy');
    expect(service.translate('splash.taglineLineOne')).toBe('Bible Study • Devotions');
    expect(service.translate('splash.taglineLineTwo')).toBe('Prayer • Giving');

    await service.setLocale('it', { persistGuest: false, source: 'runtime' });
    expect(service.translate('splash.taglineLineOne')).toBe('Studio biblico • Devozioni');
    expect(service.translate('splash.taglineLineTwo')).toBe('Preghiera • Donazioni');

    await service.setLocale('fr', { persistGuest: false, source: 'runtime' });
    expect(service.translate('splash.taglineLineOne')).toBe('Étude biblique • Dévotions');
    expect(service.translate('splash.taglineLineTwo')).toBe('Prière • Dons');
  });

  it('falls back to English when the active locale is missing a key', async () => {
    await service.initialize();
    await service.setLocale('fr', { persistGuest: false, source: 'runtime' });

    const currentMessages = service.getCurrentMessages() as Record<string, unknown>;
    delete (currentMessages['common'] as Record<string, unknown>)['retry'];

    expect(service.translate('common.retry')).toBe('Retry');
  });
});
