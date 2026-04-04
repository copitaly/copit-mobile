import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  private get baseUrl(): string {
    return environment.apiBaseUrl.replace(/\/+$/, '');
  }

  private buildUrl(path: string): string {
    const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!trimmedPath) {
      return this.baseUrl;
    }
    return `${this.baseUrl}/${trimmedPath}`;
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
    return this.http.get<T>(this.buildUrl(path), {
      params: this.buildParams(params),
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.buildUrl(path), body);
  }
}
