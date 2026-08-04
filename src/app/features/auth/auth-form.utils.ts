import { AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { LocaleService } from '../../core/localization/locale.service';

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

export function getAuthTranslatedNetworkMessage(
  localeService: LocaleService,
  action: 'sign-in' | 'register' | 'forgot-password' | 'reset-password',
  error: unknown
): string {
  if (isTimeoutError(error)) {
    return localeService.translate('errors.timeout');
  }

  if (isNetworkError(error)) {
    return localeService.translate('errors.network');
  }

  switch (action) {
    case 'sign-in':
      return localeService.translate('errors.authSignInFailed');
    case 'register':
      return localeService.translate('errors.authRegisterFailed');
    case 'forgot-password':
      return localeService.translate('errors.authForgotPasswordFailed');
    case 'reset-password':
      return localeService.translate('errors.authResetPasswordFailed');
    default:
      return localeService.translate('errors.generic');
  }
}

export function mapKnownAuthError(
  localeService: LocaleService,
  flow: 'login' | 'forgot-password' | 'reset-password',
  error: unknown
): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  if (flow === 'login' && (error.status === 400 || error.status === 401)) {
    return localeService.translate('errors.authInvalidCredentials');
  }

  if (flow === 'forgot-password' && error.status === 400) {
    return localeService.translate('validation.emailInvalid');
  }

  const detail = extractErrorDetail(error).toLowerCase();
  const tokenError = extractFirstFieldError(error.error, 'token').toLowerCase();
  const combined = `${detail} ${tokenError}`.trim();

  if (flow === 'reset-password') {
    if (combined.includes('expired')) {
      return localeService.translate('auth.expiredResetLinkMessage');
    }
    if (combined.includes('invalid')) {
      return localeService.translate('auth.invalidResetLinkMessage');
    }
  }

  return null;
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
