import { NgZone } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';

import { DeepLinkService } from './deep-link.service';

describe('DeepLinkService', () => {
  let router: jasmine.SpyObj<Router>;
  let addListenerSpy: jasmine.Spy;
  let getLaunchUrlSpy: jasmine.Spy;
  let registeredListener: ((event: { url: string }) => void) | undefined;

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

    registeredListener = undefined;
    getLaunchUrlSpy = spyOn(App, 'getLaunchUrl').and.resolveTo(undefined);
    addListenerSpy = spyOn(App, 'addListener').and.callFake((async (...args: unknown[]) => {
      registeredListener = args[1] as (event: { url: string }) => void;
      return {
        remove: async () => undefined,
      };
    }) as typeof App.addListener);

    TestBed.configureTestingModule({
      providers: [
        DeepLinkService,
        NgZone,
        { provide: Router, useValue: router },
      ],
    });
  });

  it('navigates incoming reset-password launch URLs to the Angular route', fakeAsync(() => {
    getLaunchUrlSpy.and.resolveTo({
      url: 'https://copit-production-97631.web.app/reset-password/uid123/token456',
    });

    TestBed.inject(DeepLinkService);
    flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reset-password/uid123/token456');
    expect(addListenerSpy).toHaveBeenCalled();
  }));

  it('navigates warm appUrlOpen reset-password links without logging raw tokens', fakeAsync(() => {
    const logSpy = spyOn(console, 'log');

    TestBed.inject(DeepLinkService);
    flushMicrotasks();

    expect(registeredListener).toEqual(jasmine.any(Function));

    registeredListener?.({
      url: 'https://copit-production-97631.web.app/reset-password/safe-uid/safe-token',
    });
    flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reset-password/safe-uid/safe-token');
    const loggedText = logSpy.calls
      .allArgs()
      .reduce<unknown[]>((accumulator, args) => accumulator.concat(args), [])
      .map((value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value)))
      .join(' ');
    expect(loggedText).not.toContain('safe-token');
    expect(loggedText).toContain('/reset-password/:uid/:token');
  }));

  it('keeps existing donation success deep links working', fakeAsync(() => {
    getLaunchUrlSpy.and.resolveTo({
      url: 'copit://donate/success?session_id=session-1&transaction_reference=txn-1',
    });

    TestBed.inject(DeepLinkService);
    flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/donate/success?session_id=session-1&transaction_reference=txn-1'
    );
  }));
});
