import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import {
  AuthTokenResponse,
  MemberLoginRequest,
  MemberProfile,
  MemberProfileUpdateRequest,
  MemberRecentDonation,
  MemberRegisterRequest,
  PaginatedResponse,
  SavedChurch,
} from '../models/user.model';
import { AuthStorageService } from './auth-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly csrfCookieName = 'csrftoken';

  private readonly currentUserSubject = new BehaviorSubject<MemberProfile | null>(null);
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly authLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly refreshUrl = this.buildUrl('auth/token/refresh');
  private readonly logoutUrl = this.buildUrl('auth/logout');
  private readonly csrfUrl = this.buildUrl('auth/csrf');
  private readonly accountDeleteUrl = this.buildUrl('account/me');
  private readonly initializationPromise: Promise<void>;
  private accessToken: string | null = null;

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly authLoading$ = this.authLoadingSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly authStorage: AuthStorageService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.initializationPromise = this.restoreAuthState();
  }

  get currentUserSnapshot(): MemberProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticatedSnapshot(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get accessTokenSnapshot(): string | null {
    return this.accessToken;
  }

  initialize(): Promise<void> {
    return this.initializationPromise;
  }

  setCurrentUser(user: MemberProfile | null): void {
    if (user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      void this.authStorage.setCurrentUser(user);
      return;
    }

    this.currentUserSubject.next(null);
    void this.authStorage.removeCurrentUser();
  }

  login(payload: MemberLoginRequest): Observable<MemberProfile> {
    return from(this.initializationPromise).pipe(
      switchMap(() => {
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
      })
    );
  }

  register(payload: MemberRegisterRequest): Observable<MemberProfile> {
    return from(this.initializationPromise).pipe(
      switchMap(() => {
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
      })
    );
  }

  getCurrentUser(): Observable<MemberProfile | null> {
    return from(this.initializationPromise).pipe(switchMap(() => this.getCurrentUserInternal()));
  }

  getMemberDonations(nextPageUrl?: string | null): Observable<PaginatedResponse<MemberRecentDonation>> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.fetchMemberDonations(token, nextPageUrl)))
    );
  }

  getSavedChurches(): Observable<SavedChurch[]> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.fetchSavedChurches(token)))
    );
  }

  saveChurch(churchId: number): Observable<SavedChurch> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.persistSavedChurch(token, churchId)))
    );
  }

  unsaveChurch(savedChurchId: number): Observable<void> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.removeSavedChurch(token, savedChurchId)))
    );
  }

  logout(): void {
    this.clearSession();
    this.sendCookieBackedAuthRequest<void>(this.logoutUrl, 'POST', {})
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  deleteAccount(): Observable<void> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.performAccountDelete(token)))
    );
  }

  updateMemberProfile(payload: MemberProfileUpdateRequest): Observable<MemberProfile> {
    return from(this.initializationPromise).pipe(
      switchMap(() => this.withToken((token) => this.performMemberProfileUpdate(token, payload)))
    );
  }

  clearLocalAuthState(): void {
    this.clearSession();
  }

  private setAuthenticatedProfile(profile: MemberProfile): void {
    this.setCurrentUser(profile);
    this.isAuthenticatedSubject.next(true);
  }

  private clearSession(): void {
    this.setCurrentUser(null);
    this.accessToken = null;
    this.isAuthenticatedSubject.next(false);
    void this.authStorage.removeAccessToken();
  }

  private storeAccessToken(token: string): void {
    this.accessToken = token;
    this.isAuthenticatedSubject.next(true);
    void this.authStorage.setAccessToken(token);
  }

  private refreshAccessToken(): Observable<string> {
    return this.sendCookieBackedAuthRequest<{ access: string }>(this.refreshUrl, 'POST', {}).pipe(
      map((response) => this.extractAccessToken(response)),
      tap((token) => this.storeAccessToken(token))
    );
  }

  private async restoreAuthState(): Promise<void> {
    const [token, profile] = await Promise.all([
      this.authStorage.getAccessToken(),
      this.authStorage.getCurrentUser(),
    ]);

    this.accessToken = token;
    this.currentUserSubject.next(profile);
    this.isAuthenticatedSubject.next(!!token);

    if (!token && !profile) {
      return;
    }

    try {
      await firstValueFrom(this.getCurrentUserInternal());
    } catch {
      // Preserve the existing startup behavior of failing closed when session recovery is invalid.
    }
  }

  private getCurrentUserInternal(): Observable<MemberProfile | null> {
    const token = this.accessToken;
    if (!token) {
      return this.refreshAccessToken().pipe(
        switchMap((refreshedToken) => this.fetchCurrentUser(refreshedToken)),
        catchError((error) => this.handleRefreshFailure(error))
      );
    }

    return this.fetchCurrentUser(token).pipe(
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

  private withToken<T>(requestFactory: (token: string) => Observable<T>): Observable<T> {
    const token = this.accessToken;
    if (!token) {
      return this.refreshAccessToken().pipe(
        switchMap((refreshedToken) => requestFactory(refreshedToken)),
        catchError((error) =>
          this.handleRefreshFailure(error).pipe(switchMap(() => throwError(() => error)))
        )
      );
    }

    return requestFactory(token).pipe(
      catchError((error) => {
        if (!this.isUnauthorized(error)) {
          return throwError(() => error);
        }

        return this.refreshAccessToken().pipe(
          switchMap((refreshedToken) => requestFactory(refreshedToken)),
          catchError((refreshError) =>
            this.handleRefreshFailure(refreshError).pipe(switchMap(() => throwError(() => refreshError)))
          )
        );
      })
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

  private performMemberProfileUpdate(
    token: string,
    payload: MemberProfileUpdateRequest
  ): Observable<MemberProfile> {
    return this.http.patch<MemberProfile>(this.buildUrl('members/me'), payload, {
      headers: this.buildAuthHeaders(token),
      withCredentials: true,
    }).pipe(
      tap((profile) => this.setAuthenticatedProfile(profile))
    );
  }

  private performAccountDelete(token: string): Observable<void> {
    return this.http.delete<void>(this.accountDeleteUrl, {
      headers: this.buildAuthHeaders(token),
      withCredentials: true,
    });
  }

  private persistSavedChurch(token: string, churchId: number): Observable<SavedChurch> {
    return this.http.post<SavedChurch>(
      this.buildUrl('members/me/saved-churches'),
      { church_id: churchId },
      {
        headers: this.buildAuthHeaders(token),
        withCredentials: true,
      }
    );
  }

  private removeSavedChurch(token: string, savedChurchId: number): Observable<void> {
    return this.http.delete<void>(this.buildUrl(`members/me/saved-churches/${savedChurchId}`), {
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
