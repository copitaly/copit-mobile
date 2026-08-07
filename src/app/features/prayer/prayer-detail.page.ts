import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { CommunityPrayerRequest, PrayerCategory } from '../../core/models/prayer.model';
import { PrayerService } from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-detail',
  templateUrl: './prayer-detail.page.html',
  styleUrls: ['./prayer-detail.page.scss'],
})
export class PrayerDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly prayerService = inject(PrayerService);
  private readonly localeService = inject(LocaleService);

  prayer: CommunityPrayerRequest | null = null;
  loading = true;
  notFound = false;
  errorMessage = '';
  private requestInFlight = false;
  private lastRequestedId: number | null = null;

  readonly skeletonItems = [1, 2, 3, 4];

  ngOnInit(): void {
    this.loadPrayer();
  }

  loadPrayer(): void {
    const prayerId = this.getValidatedPrayerId();
    if (!prayerId || this.requestInFlight) {
      if (!prayerId) {
        this.loading = false;
        this.prayer = null;
        this.notFound = false;
        this.errorMessage = this.localeService.translate('prayer.invalidDetailLink');
      }
      return;
    }

    this.requestInFlight = true;
    this.lastRequestedId = prayerId;
    this.loading = true;
    this.notFound = false;
    this.errorMessage = '';
    this.prayer = null;

    this.prayerService.getCommunityPrayer(prayerId).subscribe({
      next: (prayer) => {
        if (this.lastRequestedId !== prayerId) {
          return;
        }

        this.prayer = prayer;
        this.loading = false;
        this.requestInFlight = false;
      },
      error: (error: unknown) => {
        if (this.lastRequestedId !== prayerId) {
          return;
        }

        this.loading = false;
        this.requestInFlight = false;
        this.prayer = null;
        this.notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.notFound ? '' : this.resolveLoadErrorMessage(error);
      },
    });
  }

  retryLoad(): void {
    this.loadPrayer();
  }

  formatCategoryLabel(category: PrayerCategory): string {
    return this.localeService.translate(`prayer.${category}`);
  }

  formatScopeContext(prayer: CommunityPrayerRequest): string {
    switch (prayer.scope) {
      case 'global':
        return this.localeService.translate('prayer.copItaly');
      case 'area':
        return prayer.church?.name
          ? `${prayer.church.name} ${this.localeService.translate('prayer.area')}`
          : this.localeService.translate('prayer.area');
      case 'district': {
        const parts = prayer.church?.name ? [`${prayer.church.name} ${this.localeService.translate('prayer.district')}`] : [];
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} ${this.localeService.translate('prayer.area')}`);
        }
        return parts.join(' - ') || this.localeService.translate('prayer.district');
      }
      case 'local': {
        const parts = prayer.church?.name ? [prayer.church.name] : [];
        if (prayer.church?.district?.name) {
          parts.push(`${prayer.church.district.name} ${this.localeService.translate('prayer.district')}`);
        }
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} ${this.localeService.translate('prayer.area')}`);
        }
        return parts.join(' - ') || this.localeService.translate('prayer.local');
      }
      case 'unknown':
        return this.localeService.translate('prayer.scopeUnavailable');
      default:
        return this.localeService.translate('prayer.copItaly');
    }
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.localeService.translate('prayer.dateUnavailable');
    }

    return new Intl.DateTimeFormat(this.localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatSubmittedLabel(value: string): string {
    const formatted = this.formatDate(value);
    return formatted === this.localeService.translate('prayer.dateUnavailable')
      ? formatted
      : this.localeService.translate('prayer.submittedOn', { date: formatted });
  }

  private getValidatedPrayerId(): number | null {
    const rawId = this.route.snapshot.paramMap.get('id');
    const normalizedId = Number(rawId);
    return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
  }

  private resolveLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.localeService.translate('prayer.detailOfflineError');
    }

    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();
    if (message.includes('timeout')) {
      return this.localeService.translate('prayer.detailTimeoutError');
    }

    return this.localeService.translate('prayer.detailLoadErrorTitle');
  }

  private get localeTag(): string {
    switch (this.localeService.getCurrentLocale()) {
      case 'it':
        return 'it-IT';
      case 'fr':
        return 'fr-FR';
      default:
        return 'en-GB';
    }
  }
}
