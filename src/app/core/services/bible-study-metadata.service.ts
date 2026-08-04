import { Injectable } from '@angular/core';

import { LocaleService } from '../localization/locale.service';
import { BibleStudyManualDetail, BibleStudyManualListItem } from '../models/bible-study.model';

type ManualMetadataSource = Pick<
  BibleStudyManualListItem | BibleStudyManualDetail,
  'year' | 'language_display' | 'volume' | 'start_week' | 'end_week'
>;

@Injectable({ providedIn: 'root' })
export class BibleStudyMetadataService {
  constructor(private readonly localeService: LocaleService) {}

  formatPrimaryMetadata(manual: ManualMetadataSource | null | undefined): string {
    if (!manual) {
      return '';
    }

    return this.joinParts([
      this.formatYear(manual.year),
      this.normalizeText(manual.language_display),
    ]);
  }

  formatSecondaryMetadata(manual: ManualMetadataSource | null | undefined): string {
    if (!manual) {
      return '';
    }

    return this.joinParts([
      this.formatVolume(manual.volume),
      this.formatWeekRange(manual),
    ]);
  }

  formatWeekRange(manual: Pick<ManualMetadataSource, 'start_week' | 'end_week'> | null | undefined): string {
    if (!manual || manual.start_week === null || manual.end_week === null) {
      return this.localeService.translate('bibleStudy.fullYear');
    }

    if (manual.start_week === manual.end_week) {
      return `${this.localeService.translate('bibleStudy.week')} ${manual.start_week}`;
    }

    return `${this.localeService.translate('bibleStudy.weeks')} ${manual.start_week}\u2013${manual.end_week}`;
  }

  formatVolume(volume: string | null | undefined): string | null {
    const trimmed = this.normalizeText(volume);
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/^volume\s+(.+)$/i);
    const value = match ? match[1].trim() : trimmed;
    return this.localeService.translate('bibleStudy.volume', { value });
  }

  private formatYear(year: number | null | undefined): string {
    return typeof year === 'number' && Number.isFinite(year) && year > 0 ? `${year}` : '';
  }

  private joinParts(parts: Array<string | null | undefined>): string {
    const separator = ` ${this.localeService.translate('bibleStudy.metadataSeparator')} `;
    return parts.filter((part): part is string => !!part && !!part.trim()).join(separator);
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }
}
