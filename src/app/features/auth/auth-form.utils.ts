import { AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

export const AUTH_PASSWORD_MIN_LENGTH = 6;
export const AUTH_FALLBACK_RETURN_URL = '/tabs/home';

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERNAL_AUTH_ROUTE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function trimmedRequiredValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  return value ? null : { required: true };
}

export function emailFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  if (!value) {
    return null;
  }

  return SIMPLE_EMAIL_PATTERN.test(value) ? null : { email: true };
}

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`;
  if (!value) {
    return null;
  }

  return value.length >= AUTH_PASSWORD_MIN_LENGTH
    ? null
    : {
        minlength: {
          requiredLength: AUTH_PASSWORD_MIN_LENGTH,
          actualLength: value.length,
        },
      };
}

export function extractErrorDetail(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }

  const detail = error.error?.detail;
  return typeof detail === 'string' ? detail.trim() : '';
}

export function extractFirstFieldError(errorBody: unknown, field: string): string {
  if (!errorBody || typeof errorBody !== 'object' || !(field in (errorBody as Record<string, unknown>))) {
    return '';
  }

  const value = (errorBody as Record<string, unknown>)[field];
  if (Array.isArray(value) && value.length > 0) {
    return `${value[0] ?? ''}`.trim();
  }
  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

export function hasFieldError(error: HttpErrorResponse, field: string): boolean {
  return !!extractFirstFieldError(error.error, field);
}

export function isTimeoutError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'TimeoutError';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

export function getAuthNetworkMessage(actionLabel: string, error: unknown): string {
  if (isTimeoutError(error)) {
    return `The request took too long. Please try again.`;
  }

  if (isNetworkError(error)) {
    return 'Unable to connect. Check your internet connection and try again.';
  }

  return `We couldn't ${actionLabel} right now. Please try again.`;
}

export function sanitizeAuthReturnUrl(
  candidate: string | null | undefined,
  fallback = AUTH_FALLBACK_RETURN_URL
): string {
  const trimmed = `${candidate ?? ''}`.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return fallback;
  }

  if (INTERNAL_AUTH_ROUTE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return fallback;
  }

  return trimmed;
}
