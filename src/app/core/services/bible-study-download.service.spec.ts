import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { BibleStudyDownloadService } from './bible-study-download.service';

describe('BibleStudyDownloadService', () => {
  let service: BibleStudyDownloadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BibleStudyDownloadService);
  });

  it('downloads to Documents on native platforms', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    const nativeSpy = spyOn<any>(service, 'downloadNative').and.resolveTo({
      fileName: 'manual.pdf',
      locationLabel: 'your device share sheet',
      uri: 'file://manual.pdf',
      shared: true,
    });

    const result = await service.downloadPdf('https://example.com/manual.pdf', 'manual.pdf');

    expect(nativeSpy).toHaveBeenCalledWith('https://example.com/manual.pdf', 'manual.pdf');
    expect(result.locationLabel).toContain('share sheet');
  });

  it('uses a browser download fallback on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    const browserSpy = spyOn<any>(service, 'downloadInBrowser').and.resolveTo({
      fileName: 'manual.pdf',
      locationLabel: 'your browser downloads',
    });

    const result = await service.downloadPdf('https://example.com/manual.pdf', 'manual.pdf');

    expect(browserSpy).toHaveBeenCalledWith('https://example.com/manual.pdf', 'manual.pdf');
    expect(result.locationLabel).toBe('your browser downloads');
  });

  it('rejects malformed or unsafe document urls before downloading', async () => {
    await expectAsync(service.downloadPdf('javascript:alert(1)', 'manual.pdf')).toBeRejectedWithError('Invalid PDF URL');
  });

  it('writes binary PDF data to the filesystem cache and invokes Share on native platforms', async () => {
    const payload = new Uint8Array([1, 2, 3, 4]).buffer;
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(window, 'fetch').and.resolveTo(
      new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    );
    const writeHelperSpy = spyOn<any>(service, 'writeNativeFile').and.resolveTo('file://cache/manual.pdf');
    const shareSpy = spyOn<any>(service, 'shareNativeFile').and.resolveTo(true);

    const result = await service.downloadPdf('https://example.com/manual.pdf', 'manual.pdf');

    expect(writeHelperSpy).toHaveBeenCalledWith(
      'COP/BibleStudy/manual.pdf',
      jasmine.any(String)
    );
    expect(shareSpy).toHaveBeenCalledWith(jasmine.stringMatching(/manual\.pdf$/), 'manual.pdf');
    expect(result.shared).toBeTrue();
  });

  it('rejects unsupported content types', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    spyOn(window, 'fetch').and.resolveTo(
      new Response('bad', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    await expectAsync(service.downloadPdf('https://example.com/manual.pdf', 'manual.pdf')).toBeRejectedWithError(
      'Unsupported PDF content type'
    );
  });
});
