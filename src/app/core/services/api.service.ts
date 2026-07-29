import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private static readonly sensitiveQueryKeys = new Set([
    'client_secret',
    'token',
    'transaction_reference',
    'session_id',
    'donation_id',
    'recurring_donation_id',
    'password',
    'email',
  ]);

  constructor(private readonly http: HttpClient) {}

  private get baseUrl(): string {
    return environment.apiBaseUrl.replace(/\/+$/, '');
  }

  private isAbsoluteUrl(path: string): boolean {
    return /^https?:\/\//i.test(path);
  }

  private ensureTrailingSlash(value: string): string {
    if (!value) {
      return '';
    }

    const searchIndex = value.indexOf('?');
    const hashIndex = value.indexOf('#');
    const endIndex = Math.min(
      searchIndex === -1 ? value.length : searchIndex,
      hashIndex === -1 ? value.length : hashIndex
    );

    const main = value.slice(0, endIndex);
    const suffix = value.slice(endIndex);
    const normalizedMain = main ? (main.endsWith('/') ? main : `${main}/`) : '';
    return `${normalizedMain}${suffix}`;
  }

  private normalizePath(path: string): string {
    if (this.isAbsoluteUrl(path)) {
      return this.ensureTrailingSlash(path);
    }

    const trimmedPath = path.replace(/^\/*/, '').replace(/\/+$/, '');
    const normalized = trimmedPath ? `${trimmedPath}/` : '';
    return normalized;
  }

  private buildUrl(path: string): string {
    if (this.isAbsoluteUrl(path)) {
      return this.ensureTrailingSlash(path);
    }

    const normalizedPath = this.normalizePath(path);
    if (!normalizedPath) {
      return this.baseUrl;
    }
    return `${this.baseUrl}/${normalizedPath}`;
  }

  private buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        continue;
      }
      httpParams = httpParams.set(key, String(value));
    }

    return httpParams;
  }

  get<T>(path: string, params?: QueryParams): Observable<T> {
    const url = this.buildUrl(path);
    if (!environment.production) {
      console.log('[ApiService] GET', this.sanitizeLogUrl(url));
    }
    return this.http.get<T>(url, {
      params: this.buildParams(params),
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.buildUrl(path), body);
  }

  private sanitizeLogUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.forEach((_, key) => {
        if (ApiService.sensitiveQueryKeys.has(key.toLowerCase())) {
          parsed.searchParams.set(key, '[redacted]');
        }
      });
      return parsed.toString();
    } catch {
      return url;
    }
  }
}
