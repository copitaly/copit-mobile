import { DevotionalFrequency, DevotionalPublicListItem } from '../models/devotional.model';

export type DevotionalAvailabilityMessage = (
  kind: 'daily' | 'weekly',
  values: { date?: string; start?: string; end?: string }
) => string;

export function normalizeDevotionalFrequency(value: unknown): DevotionalFrequency {
  return value === 'weekly' ? 'weekly' : 'daily';
}

export function normalizeDevotionalDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? normalized
    : null;
}

export function getEffectiveDevotionalEndDate(
  publicationDate: string | null,
  frequency: DevotionalFrequency,
  availableUntil: string | null,
): string | null {
  if (!publicationDate) {
    return null;
  }

  if (availableUntil && normalizeDevotionalDate(availableUntil)) {
    return availableUntil;
  }

  if (frequency === 'daily') {
    return publicationDate;
  }

  const parsed = parseDateOnly(publicationDate);
  if (!parsed) {
    return null;
  }
  parsed.setUTCDate(parsed.getUTCDate() + 6);
  return formatDateOnly(parsed);
}

export function formatDevotionalAvailability(
  devotional: Pick<DevotionalPublicListItem, 'publication_date' | 'frequency' | 'available_until'>,
  locale: string,
  translate: DevotionalAvailabilityMessage,
): string | null {
  const start = normalizeDevotionalDate(devotional.publication_date);
  if (!start) {
    return null;
  }

  const frequency = normalizeDevotionalFrequency(devotional.frequency);
  const end = getEffectiveDevotionalEndDate(start, frequency, devotional.available_until ?? null);
  if (!end) {
    return null;
  }

  const startLabel = formatDateOnlyForDisplay(start, locale);
  const endLabel = formatDateOnlyForDisplay(end, locale);
  if (frequency === 'daily') {
    return translate('daily', { date: startLabel });
  }

  const weeklyStartLabel = start.slice(0, 4) === end.slice(0, 4)
    ? startLabel.replace(/\s+\d{4}$/, '')
    : startLabel;
  return translate('weekly', { start: weeklyStartLabel, end: endLabel });
}

export function getRomeDateKey(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values: Record<string, string> = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }
  return `${values['year']}-${values['month']}-${values['day']}`;
}

export function isDevotionalActiveOnDate(
  devotional: Pick<DevotionalPublicListItem, 'publication_date' | 'frequency' | 'available_until'>,
  dateKey: string,
): boolean {
  const start = normalizeDevotionalDate(devotional.publication_date);
  if (!start || !normalizeDevotionalDate(dateKey)) {
    return false;
  }

  const frequency = normalizeDevotionalFrequency(devotional.frequency);
  const end = getEffectiveDevotionalEndDate(start, frequency, devotional.available_until ?? null);
  return !!end && start <= dateKey && dateKey <= end;
}

function parseDateOnly(value: string): Date | null {
  const normalized = normalizeDevotionalDate(value);
  if (!normalized) {
    return null;
  }
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(value: Date): string {
  return [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, '0'), String(value.getUTCDate()).padStart(2, '0')].join('-');
}

function formatDateOnlyForDisplay(value: string, locale: string): string {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
