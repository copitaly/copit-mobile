import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class DeepLinkService implements OnDestroy {
  private listener?: PluginListenerHandle;
  private readonly routeHandlers = new Map<string, (params: URLSearchParams) => void>([
    ['/donate/success', params => this.handleSuccessRoute(params)],
    ['/donate/cancel', () => this.navigate('/donate/cancel')],
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
    console.log('[DeepLinkService] incoming url', { rawUrl, source });
    const parsed = this.parseUrl(rawUrl);
    if (!parsed) {
      console.warn('[DeepLinkService] unable to parse deep link', rawUrl);
      return;
    }
    console.log('[DeepLinkService] parsed route', parsed.pathname);
    const handler = this.routeHandlers.get(parsed.pathname);
    if (!handler) {
      console.warn('[DeepLinkService] no handler for path', parsed.pathname);
      return;
    }
    handler(parsed.searchParams);
  }

  private parseUrl(rawUrl: string): { pathname: string; searchParams: URLSearchParams } | null {
    try {
      const parsed = new URL(rawUrl);
      return {
        pathname: parsed.pathname,
        searchParams: parsed.searchParams,
      };
    } catch (error) {
      console.error('[DeepLinkService] URL parsing error', error);
      return null;
    }
  }

  private handleSuccessRoute(params: URLSearchParams): void {
    const sessionId = params.get('session_id');
    console.log('[DeepLinkService] parsed session_id', sessionId ?? '<missing>');
    this.navigate('/donate/success', sessionId ? { session_id: sessionId } : undefined);
  }

  private navigate(path: string, queryParams?: Record<string, string>): void {
    console.log('[DeepLinkService] navigation attempt', { path, queryParams });
    this.zone.run(() => {
      this.router
        .navigate([path], { queryParams })
        .then(result => {
          console.log('[DeepLinkService] navigation result', { path, result });
        })
        .catch(error => {
          console.error('[DeepLinkService] navigation error', path, error);
        });
    });
  }
}
