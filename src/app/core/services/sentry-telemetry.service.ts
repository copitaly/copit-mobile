import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/capacitor';
import { Subscription } from 'rxjs';

import { MemberProfile } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { sanitizeSentryValue, toApiPath } from '../utils/sentry-sanitizer';

type FeatureArea = 'saved_churches' | 'donations' | 'profile' | 'auth' | 'churches' | 'home' | 'app';

@Injectable({ providedIn: 'root' })
export class SentryTelemetryService implements OnDestroy {
  private readonly subscriptions = new Subscription();
  private initialized = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  initialize(): void {
    if (this.initialized || !environment.sentryEnabled || !environment.sentryDsn?.trim()) {
      return;
    }

    this.initialized = true;
    this.setStaticContext();
    this.trackAuthContext();
    this.trackRouter();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  addFeatureBreadcrumb(
    featureArea: FeatureArea,
    message: string,
    data?: Record<string, unknown>,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    if (!environment.sentryEnabled || !environment.sentryDsn?.trim()) {
      return;
    }

    Sentry.addBreadcrumb({
      category: 'feature',
      type: 'default',
      level,
      message,
      data: sanitizeSentryValue({
        feature_area: featureArea,
        ...data,
      }) as Record<string, unknown>,
    });
  }

  addHttpBreadcrumb(
    method: string,
    url: string,
    status: number,
    featureArea?: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    if (!environment.sentryEnabled || !environment.sentryDsn?.trim()) {
      return;
    }

    Sentry.addBreadcrumb({
      category: 'http',
      type: 'http',
      level,
      message: `${method.toUpperCase()} ${toApiPath(url)}`,
      data: {
        method: method.toUpperCase(),
        path: toApiPath(url),
        status,
        feature_area: featureArea ?? this.getCurrentFeatureArea(),
      },
    });
  }

  captureHttpFailure(error: HttpErrorResponse, method: string, url: string, featureArea?: string): void {
    if (!environment.sentryEnabled || !environment.sentryDsn?.trim()) {
      return;
    }

    const path = toApiPath(url);
    const resolvedFeatureArea = featureArea ?? this.getCurrentFeatureArea();
    const sanitizedErrorBody = sanitizeSentryValue(error.error);

    this.addHttpBreadcrumb(method, url, error.status, resolvedFeatureArea, error.status >= 500 ? 'error' : 'warning');

    Sentry.withScope((scope) => {
      scope.setLevel(error.status >= 500 ? 'error' : 'warning');
      scope.setTag('feature_area', resolvedFeatureArea);
      scope.setTag('http_method', method.toUpperCase());
      scope.setTag('http_status', String(error.status || 0));
      scope.setContext('http_request', {
        method: method.toUpperCase(),
        path,
        status: error.status,
        statusText: error.statusText,
      });
      scope.setContext('http_response', {
        error: sanitizedErrorBody,
      });

      Sentry.captureException(error);
    });
  }

  getCurrentFeatureArea(): FeatureArea {
    return this.featureAreaFromUrl(this.router.url);
  }

  private setStaticContext(): void {
    Sentry.setTag('platform', Capacitor.getPlatform());
    Sentry.setContext('app', {
      native: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      production: environment.production,
    });
  }

  private trackAuthContext(): void {
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
        Sentry.setTag('auth_state', isAuthenticated ? 'authenticated' : 'anonymous');
        if (!isAuthenticated) {
          Sentry.setUser(null);
          Sentry.setContext('member', { authenticated: false });
        }
      })
    );

    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        this.applyUserContext(user);
      })
    );
  }

  private trackRouter(): void {
    this.subscriptions.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          const featureArea = this.featureAreaFromUrl(event.urlAfterRedirects);
          Sentry.setTag('feature_area', featureArea);
          Sentry.addBreadcrumb({
            category: 'navigation',
            type: 'navigation',
            level: 'info',
            message: event.urlAfterRedirects,
            data: {
              route: event.urlAfterRedirects,
              feature_area: featureArea,
            },
          });
        }

        if (event instanceof NavigationError) {
          const featureArea = this.featureAreaFromUrl(event.url);
          Sentry.withScope((scope) => {
            scope.setLevel('error');
            scope.setTag('feature_area', featureArea);
            scope.setContext('navigation', {
              route: event.url,
              feature_area: featureArea,
            });

            Sentry.captureException(event.error ?? new Error(`Navigation failed for ${event.url}`));
          });
        }
      })
    );
  }

  private applyUserContext(user: MemberProfile | null): void {
    if (!user) {
      return;
    }

    Sentry.setUser({
      id: String(user.id),
    });
    Sentry.setTag('member_role', user.role ?? 'unknown');
    Sentry.setContext('member', {
      authenticated: true,
      id: user.id,
      role: user.role ?? null,
      access_scope_count: user.access_scope?.length ?? 0,
      assigned_branch_count: user.assigned_branches?.length ?? 0,
      language: user.language ?? null,
    });
  }

  private featureAreaFromUrl(url: string): FeatureArea {
    const pathname = toApiPath(url);

    if (pathname.includes('saved-churches')) {
      return 'saved_churches';
    }

    if (pathname.includes('donate') || pathname.includes('donation')) {
      return 'donations';
    }

    if (pathname.includes('profile')) {
      return 'profile';
    }

    if (pathname.includes('login') || pathname.includes('register')) {
      return 'auth';
    }

    if (pathname.includes('branches')) {
      return 'churches';
    }

    if (pathname.includes('home')) {
      return 'home';
    }

    return 'app';
  }
}
