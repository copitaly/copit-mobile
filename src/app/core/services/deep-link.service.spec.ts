import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';

import { DeepLinkService } from './deep-link.service';

describe('DeepLinkService', () => {
  let router: jasmine.SpyObj<Router>;
  let service: DeepLinkService;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl', 'createUrlTree']);
    router.navigateByUrl.and.resolveTo(true);
    router.createUrlTree.and.callFake((commands: readonly unknown[], extras?: { queryParams?: Record<string, string> }) => ({
      toString: () => {
        const base = String(commands[0] ?? '');
        if (!extras?.queryParams) {
          return base;
        }
        const query = new URLSearchParams(extras.queryParams).toString();
        return query ? `${base}?${query}` : base;
      },
    }) as never);

    spyOn(App, 'getLaunchUrl').and.resolveTo(undefined);
    spyOn(App, 'addListener').and.resolveTo({
      remove: async () => undefined,
    } as never);

    service = new DeepLinkService(
      router,
      {
        run<T>(fn: () => T): T {
          return fn();
        },
      } as NgZone
    );
  });

  it('navigates reset-password URLs to the Angular route', async () => {
    await (service as unknown as { processUrl(rawUrl: string, source: string): void }).processUrl(
      'https://copit-production-97631.web.app/reset-password/uid123/token456',
      'test'
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reset-password/uid123/token456');
  });

  it('does not log raw reset-password tokens', async () => {
    const logSpy = spyOn(console, 'log');

    await (service as unknown as { processUrl(rawUrl: string, source: string): void }).processUrl(
      'https://copit-production-97631.web.app/reset-password/safe-uid/safe-token',
      'test'
    );

    const loggedText = logSpy.calls
      .allArgs()
      .reduce<unknown[]>((accumulator, args) => accumulator.concat(args), [])
      .map((value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value)))
      .join(' ');

    expect(loggedText).not.toContain('safe-token');
    expect(loggedText).toContain('/reset-password/:uid/:token');
  });

  it('keeps existing donation success deep links working', async () => {
    await (service as unknown as { processUrl(rawUrl: string, source: string): void }).processUrl(
      'copit://donate/success?session_id=session-1&transaction_reference=txn-1',
      'test'
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/donate/success?session_id=session-1&transaction_reference=txn-1'
    );
  });

  it('preserves native donation success identifiers in deep links', async () => {
    await (service as unknown as { processUrl(rawUrl: string, source: string): void }).processUrl(
      'copit://donate/success?donation_id=55&transaction_reference=txn-55',
      'test'
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/donate/success?donation_id=55&transaction_reference=txn-55'
    );
  });
});
