export type SupportedLanguageCode = 'en' | 'it' | 'fr';

export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en';
export const FALLBACK_LANGUAGE: SupportedLanguageCode = 'en';

export const SUPPORTED_LANGUAGE_OPTIONS: ReadonlyArray<{ value: SupportedLanguageCode; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'fr', label: 'Français' },
] as const;

export function resolveSupportedLanguage(value: unknown): SupportedLanguageCode | null {
  const normalized = `${value ?? ''}`.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 'en' || normalized === 'it' || normalized === 'fr') {
    return normalized;
  }

  if (normalized === 'english' || normalized.startsWith('en-')) {
    return 'en';
  }

  if (normalized === 'italian' || normalized.startsWith('it-')) {
    return 'it';
  }

  if (normalized === 'french' || normalized.startsWith('fr-')) {
    return 'fr';
  }

  return null;
}

export function normalizePreferredLanguage(value: unknown): SupportedLanguageCode {
  return resolveSupportedLanguage(value) ?? DEFAULT_LANGUAGE;
}
