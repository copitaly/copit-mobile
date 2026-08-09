import { TestBed } from '@angular/core/testing';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import { ExternalBrowserService } from './external-browser.service';

describe('ExternalBrowserService', () => {
  let service: ExternalBrowserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalBrowserService);
  });

  it('uses the Capacitor Browser plugin on native platforms', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    const browserOpenSpy = spyOn(Browser, 'open').and.returnValue(Promise.resolve());

    await service.openUrl('https://admin.copitaly.org/privacy-policy');

    expect(browserOpenSpy).toHaveBeenCalledWith({ url: 'https://admin.copitaly.org/privacy-policy' });
  });

  it('opens a safe browser tab on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    const windowOpenSpy = spyOn(window, 'open');

    await service.openUrl('https://admin.copitaly.org/terms-and-conditions');

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://admin.copitaly.org/terms-and-conditions',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
