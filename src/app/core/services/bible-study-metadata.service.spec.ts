import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { GuestLocaleStorageService } from '../localization/guest-locale-storage.service';
import { LocaleService } from '../localization/locale.service';
import { BibleStudyMetadataService } from './bible-study-metadata.service';

describe('BibleStudyMetadataService', () => {
  let service: BibleStudyMetadataService;
  let localeService: LocaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BibleStudyMetadataService,
        LocaleService,
        {
          provide: GuestLocaleStorageService,
          useValue: {
            getGuestLocale: () => null,
            setGuestLocale: () => undefined,
          },
        },
        {
          provide: DOCUMENT,
          useValue: document,
        },
      ],
    });

    service = TestBed.inject(BibleStudyMetadataService);
    localeService = TestBed.inject(LocaleService);
  });

  it('formats multi-week metadata with a localized middle-dot separator', () => {
    const manual = {
      year: 2027,
      language_display: 'English',
      volume: '2',
      start_week: 27,
      end_week: 37,
    };

    expect(service.formatPrimaryMetadata(manual)).toBe('2027 · English');
    expect(service.formatSecondaryMetadata(manual)).toBe('Volume 2 · Weeks 27–37');
    expect(service.formatMetadata(manual)).toBe('2027 · English · Volume 2 · Weeks 27–37');
  });

  it('formats single-week manuals without repeating the week number', () => {
    const manual = {
      year: 2027,
      language_display: 'English',
      volume: 'Volume 3',
      start_week: 27,
      end_week: 27,
    };

    expect(service.formatWeekRange(manual)).toBe('Week 27');
    expect(service.formatSecondaryMetadata(manual)).toBe('Volume 3 · Week 27');
    expect(service.formatMetadata(manual)).toBe('2027 · English · Volume 3 · Week 27');
  });

  it('localizes week labels in Italian and French while preserving backend language text', async () => {
    const manual = {
      year: 2027,
      language_display: 'English',
      volume: '2',
      start_week: 27,
      end_week: 37,
    };

    await localeService.setLocale('it', { persistGuest: false, source: 'runtime' });
    expect(service.formatPrimaryMetadata(manual)).toBe('2027 · English');
    expect(service.formatSecondaryMetadata(manual)).toBe('Volume 2 · Settimane 27–37');

    await localeService.setLocale('fr', { persistGuest: false, source: 'runtime' });
    expect(service.formatPrimaryMetadata(manual)).toBe('2027 · English');
    expect(service.formatSecondaryMetadata(manual)).toBe('Volume 2 · Semaines 27–37');
  });

  it('omits missing metadata parts cleanly without duplicate separators', () => {
    const manual = {
      year: 2027,
      language_display: '',
      volume: '',
      start_week: null,
      end_week: null,
    };

    expect(service.formatMetadata(manual)).toBe('2027 · Full year');
    expect(service.formatMetadata(manual)).not.toContain('�');
  });

  it('uses the correct start and end week fields for multi-week ranges', () => {
    const manual = {
      year: 2027,
      language_display: 'English',
      volume: '2',
      start_week: 27,
      end_week: 37,
    };

    expect(service.formatWeekRange(manual)).toBe('Weeks 27–37');
    expect(service.formatWeekRange(manual)).not.toBe('Weeks 27–27');
  });
});
