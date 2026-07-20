import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class DeepLinkService implements OnDestroy {
  private listener?: PluginListenerHandle;
  private readonly resetPasswordPattern = /^\/reset-password\/[^/]+\/[^/]+\/?$/;
  private readonly routeHandlers = new Map<string, (params: URLSearchParams) => void>([
    ['/donate/success', params => this.handleSuccessRoute(params)],
    ['/donate/cancel', () => this.navigate('/donate/cancel')],
    ['/donor-redirect/donate/success', params => this.handleSuccessRoute(params)],
    ['/donor-redirect/donate/cancel', () => this.navigate('/donate/cancel')],
  ]);

  constructor(private readonly router: Router, private readonly zone: NgZone) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        this.processUrl(launchUrl.url, 'initial launch');
      }
    } catch (error) {
      console.warn('[DeepLinkService] failed to read launch URL', error);
    }

    try {
      this.listener = await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.processUrl(event.url, 'appUrlOpen');
      });
    } catch (error) {
      console.warn('[DeepLinkService] failed to register appUrlOpen listener', error);
    }
  }

  ngOnDestroy(): void {
    this.listener?.remove();
  }

  private processUrl(rawUrl: string, source: string): void {
    const parsed = this.parseUrl(rawUrl);
    if (!parsed) {
      console.warn('[DeepLinkService] unable to parse deep link', { source });
      return;
    }
    console.log('[DeepLinkService] incoming route', {
      source,
      origin: parsed.origin,
      path: this.describePath(parsed.pathname),
    });
    const handler = this.routeHandlers.get(parsed.pathname);
    if (handler) {
      handler(parsed.searchParams);
      return;
    }

    if (this.isResetPasswordPath(parsed.pathname)) {
      this.navigate(parsed.pathname);
      return;
    }

    console.warn('[DeepLinkService] no handler for path', {
      source,
      origin: parsed.origin,
      path: this.describePath(parsed.pathname),
    });
  }

  private parseUrl(rawUrl: string): { origin: string; pathname: string; searchParams: URLSearchParams } | null {
    try {
      const parsed = new URL(rawUrl);
      const normalizedPathname = this.normalizePathname(parsed);
      return {
        origin: parsed.origin,
        pathname: normalizedPathname,
        searchParams: parsed.searchParams,
      };
    } catch (error) {
      console.error('[DeepLinkService] URL parsing error', error);
      return null;
    }
  }

  private handleSuccessRoute(params: URLSearchParams): void {
    const sessionId = params.get('session_id');
    const transactionReference = params.get('transaction_reference');
    this.navigate(
      '/donate/success',
      sessionId
        ? {
            session_id: sessionId,
            ...(transactionReference ? { transaction_reference: transactionReference } : {}),
          }
        : transactionReference
          ? { transaction_reference: transactionReference }
          : undefined
    );
  }

  private normalizePathname(parsed: URL): string {
    if (parsed.protocol === 'copit:') {
      const host = parsed.host ? `/${parsed.host}` : '';
      return `${host}${parsed.pathname}` || '/';
    }

    return parsed.pathname;
  }

  private isResetPasswordPath(pathname: string): boolean {
    return this.resetPasswordPattern.test(pathname);
  }

  private describePath(pathname: string): string {
    return this.isResetPasswordPath(pathname) ? '/reset-password/:uid/:token' : pathname;
  }

  private navigate(path: string, queryParams?: Record<string, string>): void {
    const navigationTarget = queryParams
      ? this.router.createUrlTree([path], { queryParams }).toString()
      : path;

    console.log('[DeepLinkService] navigation attempt', {
      path: this.describePath(path),
      hasQueryParams: !!queryParams,
    });
    this.zone.run(() => {
      this.router
        .navigateByUrl(navigationTarget)
        .then(result => {
          console.log('[DeepLinkService] navigation result', {
            path: this.describePath(path),
            result,
          });
        })
        .catch(error => {
          console.error('[DeepLinkService] navigation error', this.describePath(path), error);
        });
    });
  }
}
