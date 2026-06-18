const SENSITIVE_KEY_PATTERN = /(authorization|password|token|secret|cookie|card|cvv|cvc)/i;
const MAX_STRING_LENGTH = 500;

export function sanitizeSentryValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeSentryValue(value.message, seen),
      stack: sanitizeSentryValue(value.stack, seen),
    };
  }

  if (seen.has(value)) {
    return '[circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSentryValue(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[redacted]';
      continue;
    }

    sanitized[key] = sanitizeSentryValue(entry, seen);
  }

  return sanitized;
}

export function toApiPath(url: string): string {
  try {
    return new URL(url, 'https://copit-mobile.local').pathname;
  } catch {
    return url;
  }
}
