export type SupportedLanguageCode = 'en' | 'it' | 'fr';

export const SUPPORTED_LANGUAGE_OPTIONS: ReadonlyArray<{ value: SupportedLanguageCode; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'fr', label: 'Français' },
] as const;

export function normalizePreferredLanguage(value: unknown): SupportedLanguageCode {
  const normalized = `${value ?? ''}`.trim().toLowerCase();

  if (!normalized) {
    return 'en';
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

  return 'en';
}
