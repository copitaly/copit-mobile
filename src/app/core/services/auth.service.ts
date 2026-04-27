import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import {
  AuthTokenResponse,
  MemberLoginRequest,
  MemberProfile,
  MemberRecentDonation,
  MemberRegisterRequest,
  PaginatedResponse,
  SavedChurch,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // TODO: Replace localStorage token persistence with a platform-secure storage solution
  // (for example Capacitor Preferences plus OS-backed secure storage) before production release.
  private static readonly accessTokenStorageKey = 'copit.member.access_token';
  private static readonly currentUserStorageKey = 'copit.member.current_user';
  private static readonly csrfCookieName = 'csrftoken';

  private readonly currentUserSubject = new BehaviorSubject<MemberProfile | null>(this.getStoredCurrentUser());
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  private readonly authLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly refreshUrl = this.buildUrl('auth/token/refresh');
  private readonly logoutUrl = this.buildUrl('auth/logout');
  private readonly csrfUrl = this.buildUrl('auth/csrf');

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly authLoading$ = this.authLoadingSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    if (this.hasStoredToken() || this.currentUserSnapshot) {
      this.getCurrentUser().subscribe({
        error: () => undefined,
      });
    }
  }

  get currentUserSnapshot(): MemberProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticatedSnapshot(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  setCurrentUser(user: MemberProfile | null): void {
    if (user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      this.storeCurrentUser(user);
      return;
    }

    this.currentUserSubject.next(null);
    localStorage.removeItem(AuthService.currentUserStorageKey);
  }

  login(payload: MemberLoginRequest): Observable<MemberProfile> {
    this.authLoadingSubject.next(true);
    return this.http
      .post<AuthTokenResponse>(this.buildUrl('auth/member-token'), payload, {
        withCredentials: true,
      })
      .pipe(
        map((response) => this.extractAccessToken(response)),
        tap((token) => this.storeAccessToken(token)),
        switchMap((token) => this.fetchCurrentUser(token)),
        finalize(() => this.authLoadingSubject.next(false))
      );
  }

  register(payload: MemberRegisterRequest): Observable<MemberProfile> {
    this.authLoadingSubject.next(true);
    return this.http
      .post<AuthTokenResponse>(this.buildUrl('auth/register'), payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => this.storeAccessToken(this.extractAccessToken(response))),
        map((response) => this.toMemberProfileFromAuthResponse(response)),
        tap((profile) => this.setAuthenticatedProfile(profile)),
        finalize(() => this.authLoadingSubject.next(false))
      );
  }

  getCurrentUser(): Observable<MemberProfile | null> {
    const token = this.getStoredAccessToken();
    if (!token) {
      return this.refreshAccessToken().pipe(
        switchMap((refreshedToken) => this.fetchCurrentUser(refreshedToken)),
        catchError((error) => this.handleRefreshFailure(error))
      );
    }

    return this.fetchCurrentUser(token)
      .pipe(
        catchError((error) => {
          if (!this.isUnauthorized(error)) {
            return throwError(() => error);
          }

          return this.refreshAccessToken().pipe(
            switchMap((refreshedToken) => this.fetchCurrentUser(refreshedToken)),
            catchError((refreshError) => this.handleRefreshFailure(refreshError))
          );
        })
      );
  }

  getMemberDonations(nextPageUrl?: string | null): Observable<PaginatedResponse<MemberRecentDonation>> {
    const token = this.getStoredAccessToken();
    if (!token) {
      return this.refreshAccessToken().pipe(
        switchMap((refreshedToken) => this.fetchMemberDonations(refreshedToken, nextPageUrl)),
        catchError((error) => this.handleRefreshFailure(error).pipe(
          switchMap(() => throwError(() => error))
        ))
      );
    }

    return this.fetchMemberDonations(token, nextPageUrl).pipe(
      catchError((error) => {
        if (!this.isUnauthorized(error)) {
          return throwError(() => error);
        }

        return this.refreshAccessToken().pipe(
          switchMap((refreshedToken) => this.fetchMemberDonations(refreshedToken, nextPageUrl)),
          catchError((refreshError) =>
            this.handleRefreshFailure(refreshError).pipe(switchMap(() => throwError(() => refreshError)))
          )
        );
      })
    );
  }

  getSavedChurches(): Observable<SavedChurch[]> {
    const token = this.getStoredAccessToken();
    if (!token) {
      return this.refreshAccessToken().pipe(
        switchMap((refreshedToken) => this.fetchSavedChurches(refreshedToken)),
        catchError((error) =>
          this.handleRefreshFailure(error).pipe(switchMap(() => throwError(() => error)))
        )
      );
    }

    return this.fetchSavedChurches(token).pipe(
      catchError((error) => {
        if (!this.isUnauthorized(error)) {
          return throwError(() => error);
        }

        return this.refreshAccessToken().pipe(
          switchMap((refreshedToken) => this.fetchSavedChurches(refreshedToken)),
          catchError((refreshError) =>
            this.handleRefreshFailure(refreshError).pipe(switchMap(() => throwError(() => refreshError)))
          )
        );
      })
    );
  }

  logout(): void {
    this.sendCookieBackedAuthRequest<void>(this.logoutUrl, 'POST', {})
      .pipe(catchError(() => EMPTY))
      .subscribe({
        complete: () => this.clearSession(),
      });
  }

  private setAuthenticatedProfile(profile: MemberProfile): void {
    this.setCurrentUser(profile);
    this.isAuthenticatedSubject.next(true);
  }

  private clearSession(): void {
    this.setCurrentUser(null);
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem(AuthService.accessTokenStorageKey);
  }

  private storeAccessToken(token: string): void {
    localStorage.setItem(AuthService.accessTokenStorageKey, token);
    this.isAuthenticatedSubject.next(true);
  }

  private getStoredAccessToken(): string | null {
    return localStorage.getItem(AuthService.accessTokenStorageKey);
  }

  private storeCurrentUser(profile: MemberProfile): void {
    localStorage.setItem(AuthService.currentUserStorageKey, JSON.stringify(profile));
  }

  private getStoredCurrentUser(): MemberProfile | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedProfile = localStorage.getItem(AuthService.currentUserStorageKey);
    if (!storedProfile) {
      return null;
    }

    try {
      return JSON.parse(storedProfile) as MemberProfile;
    } catch {
      localStorage.removeItem(AuthService.currentUserStorageKey);
      return null;
    }
  }

  private hasStoredToken(): boolean {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(AuthService.accessTokenStorageKey);
  }

  private refreshAccessToken(): Observable<string> {
    return this.sendCookieBackedAuthRequest<{ access: string }>(this.refreshUrl, 'POST', {}).pipe(
      map((response) => this.extractAccessToken(response)),
      tap((token) => this.storeAccessToken(token))
    );
  }

  private fetchCurrentUser(token: string): Observable<MemberProfile> {
    return this.http
      .get<MemberProfile>(this.buildUrl('members/me'), {
        headers: this.buildAuthHeaders(token),
        withCredentials: true,
      })
      .pipe(tap((profile) => this.setAuthenticatedProfile(profile)));
  }

  private fetchMemberDonations(
    token: string,
    nextPageUrl?: string | null
  ): Observable<PaginatedResponse<MemberRecentDonation>> {
    const url = nextPageUrl || this.buildUrl('members/me/donations');
    return this.http.get<PaginatedResponse<MemberRecentDonation>>(url, {
      headers: this.buildAuthHeaders(token),
      withCredentials: true,
    });
  }

  private fetchSavedChurches(token: string): Observable<SavedChurch[]> {
    return this.http.get<SavedChurch[]>(this.buildUrl('members/me/saved-churches'), {
      headers: this.buildAuthHeaders(token),
      withCredentials: true,
    });
  }

  private sendCookieBackedAuthRequest<T>(
    url: string,
    method: 'POST',
    body: object
  ): Observable<T> {
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      return this.http.request<T>(method, url, {
        body,
        headers: this.buildCsrfHeaders(csrfToken),
        withCredentials: true,
      });
    }

    return this.ensureCsrfCookie().pipe(
      switchMap(() =>
        this.http.request<T>(method, url, {
          body,
          headers: this.buildCsrfHeaders(this.getCsrfToken()),
          withCredentials: true,
        })
      )
    );
  }

  private ensureCsrfCookie(): Observable<void> {
    return this.http
      .get<{ detail: string }>(this.csrfUrl, { withCredentials: true })
      .pipe(map(() => void 0));
  }

  private getCsrfToken(): string | null {
    const cookie = this.document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${AuthService.csrfCookieName}=`));

    if (!cookie) {
      return null;
    }

    const token = cookie.slice(AuthService.csrfCookieName.length + 1);
    return token ? decodeURIComponent(token) : null;
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private buildCsrfHeaders(token: string | null): HttpHeaders | undefined {
    if (!token) {
      return undefined;
    }

    return new HttpHeaders({ 'X-CSRFToken': token });
  }

  private buildUrl(path: string): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/*/, '').replace(/\/+$/, '');
    return `${baseUrl}/${normalizedPath}/`;
  }

  private extractAccessToken(response: { access?: string | null }): string {
    const token = response.access;
    if (!token) {
      throw new Error('Access token missing from authentication response.');
    }

    return token;
  }

  private handleRefreshFailure(error: unknown): Observable<null> {
    if (this.isUnauthorized(error)) {
      this.clearSession();
      return of(null);
    }

    return throwError(() => error);
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
  }

  private toMemberProfileFromAuthResponse(response: AuthTokenResponse): MemberProfile {
    return {
      ...response.user,
      phone: response.user.phone_number ?? response.user.phone ?? '',
      phone_number: response.user.phone_number ?? response.user.phone ?? '',
      date_joined: '',
      donation_summary: {
        total_paid_amount: '0.00',
        total_paid_count: 0,
        currency: 'eur',
        last_donation_at: null,
      },
      recent_donations: [],
    };
  }
}
