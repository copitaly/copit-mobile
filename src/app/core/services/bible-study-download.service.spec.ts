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
      locationLabel: 'your Documents/COP/BibleStudy folder',
      uri: 'file://manual.pdf',
    });

    const result = await service.downloadPdf('https://example.com/manual.pdf', 'manual.pdf');

    expect(nativeSpy).toHaveBeenCalledWith('https://example.com/manual.pdf', 'manual.pdf');
    expect(result.locationLabel).toContain('Documents');
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
});
