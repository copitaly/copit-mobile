import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import {
  AuthTokenResponse,
  MemberLoginRequest,
  MemberProfile,
  MemberRegisterRequest,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // TODO: Replace localStorage token persistence with a platform-secure storage solution
  // (for example Capacitor Preferences plus OS-backed secure storage) before production release.
  private static readonly accessTokenStorageKey = 'copit.member.access_token';

  private readonly currentUserSubject = new BehaviorSubject<MemberProfile | null>(null);
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  private readonly authLoadingSubject = new BehaviorSubject<boolean>(false);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly authLoading$ = this.authLoadingSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    if (this.hasStoredToken()) {
      this.getCurrentUser().subscribe({
        error: () => this.logout(),
      });
    }
  }

  get currentUserSnapshot(): MemberProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticatedSnapshot(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  login(payload: MemberLoginRequest): Observable<MemberProfile> {
    this.authLoadingSubject.next(true);
    return this.http
      .post<AuthTokenResponse>(this.buildUrl('auth/member-token'), payload)
      .pipe(
        tap((response) => this.storeAccessToken(response.access)),
        map((response) => this.toMemberProfileFromAuthResponse(response)),
        tap((profile) => this.setAuthenticatedProfile(profile)),
        finalize(() => this.authLoadingSubject.next(false))
      );
  }

  register(payload: MemberRegisterRequest): Observable<MemberProfile> {
    this.authLoadingSubject.next(true);
    return this.http
      .post<AuthTokenResponse>(this.buildUrl('auth/register'), payload)
      .pipe(
        tap((response) => this.storeAccessToken(response.access)),
        map((response) => this.toMemberProfileFromAuthResponse(response)),
        tap((profile) => this.setAuthenticatedProfile(profile)),
        finalize(() => this.authLoadingSubject.next(false))
      );
  }

  getCurrentUser(): Observable<MemberProfile | null> {
    const token = this.getStoredAccessToken();
    if (!token) {
      this.clearSession();
      return of(null);
    }

    return this.http
      .get<MemberProfile>(this.buildUrl('members/me'), {
        headers: this.buildAuthHeaders(token),
      })
      .pipe(
        tap((profile) => this.setAuthenticatedProfile(profile)),
        catchError((error) => {
          this.clearSession();
          throw error;
        })
      );
  }

  logout(): void {
    this.clearSession();
  }

  private setAuthenticatedProfile(profile: MemberProfile): void {
    this.currentUserSubject.next(profile);
    this.isAuthenticatedSubject.next(true);
  }

  private clearSession(): void {
    this.currentUserSubject.next(null);
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

  private hasStoredToken(): boolean {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(AuthService.accessTokenStorageKey);
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private buildUrl(path: string): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/*/, '').replace(/\/+$/, '');
    return `${baseUrl}/${normalizedPath}/`;
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
