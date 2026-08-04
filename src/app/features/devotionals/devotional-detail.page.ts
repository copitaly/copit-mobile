import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { AppToastService } from '../../core/services/app-toast.service';
import { DevotionalService } from '../../core/services/devotional.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-devotional-detail',
  templateUrl: './devotional-detail.page.html',
  styleUrls: ['./devotional-detail.page.scss'],
})
export class DevotionalDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly devotionalService = inject(DevotionalService);
  private readonly appToast = inject(AppToastService);
  private readonly localeService = inject(LocaleService);

  devotional: DevotionalPublicDetail | null = null;
  loading = true;
  notFound = false;
  errorMessage = '';
  sharing = false;
  contentParagraphs: string[] = [];
  reflectionParagraphs: string[] = [];
  prayerParagraphs: string[] = [];
  contentFallbackMessage = this.localeService.translate('devotions.contentFallback');

  readonly skeletonItems = [1, 2, 3, 4];
  private coverImageFailed = false;
  private requestInFlight = false;
  private lastRequestedSlug: string | null = null;

  ngOnInit(): void {
    this.loadDevotional();
  }

  loadDevotional(): void {
    const slug = this.getValidatedSlug();
    if (!slug || this.requestInFlight) {
      if (!slug) {
        this.loading = false;
        this.devotional = null;
        this.notFound = false;
        this.errorMessage = this.localeService.translate('devotions.invalidLink');
      }
      return;
    }

    this.requestInFlight = true;
    this.lastRequestedSlug = slug;
    this.loading = true;
    this.notFound = false;
    this.errorMessage = '';
    this.devotional = null;
    this.contentParagraphs = [];
    this.reflectionParagraphs = [];
    this.prayerParagraphs = [];
    this.coverImageFailed = false;

    this.devotionalService.getDevotionalBySlug(slug).subscribe({
      next: (devotional) => {
        if (this.lastRequestedSlug !== slug) {
          return;
        }

        this.applyDevotional(devotional);
        this.loading = false;
        this.requestInFlight = false;
      },
      error: (error: unknown) => {
        if (this.lastRequestedSlug !== slug) {
          return;
        }

        this.loading = false;
        this.requestInFlight = false;
        this.devotional = null;
        this.contentParagraphs = [];
        this.reflectionParagraphs = [];
        this.prayerParagraphs = [];
        this.notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.notFound
          ? ''
          : this.resolveLoadErrorMessage(error);
      },
    });
  }

  retryLoad(): void {
    this.loadDevotional();
  }

  formatPublicationDate(value: string | null): string {
    if (!value) {
      return this.localeService.translate('devotions.availableNow');
    }

    const parsed = this.parsePublicationDate(value);
    if (!parsed) {
      return value;
    }

    return new Intl.DateTimeFormat(this.getDateLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }

  hasText(value: string | null | undefined): boolean {
    return !!value?.trim();
  }

  shouldShowCoverImage(): boolean {
    return !!this.devotional?.cover_image?.trim() && !this.coverImageFailed;
  }

  handleCoverImageError(): void {
    this.coverImageFailed = true;
  }

  getCoverImageAlt(): string {
    const title = this.devotional?.title?.trim();
    return title ? `${title} ${this.localeService.translate('common.coverImage')}` : `${this.localeService.translate('devotions.title')} ${this.localeService.translate('common.coverImage')}`;
  }

  getHeaderMeta(): string {
    if (!this.devotional) {
      return '';
    }

    const parts = [
      this.hasText(this.devotional.scripture_reference) ? this.devotional.scripture_reference.trim() : '',
      this.getPublisherLabel(),
    ].filter(Boolean);

    return parts.join(' · ');
  }

  getPublisherLabel(): string {
    return this.devotional?.author_name?.trim() || this.localeService.translate('devotions.publisherFallback');
  }

  getAttributionLabel(): string {
    return this.localeService.translate('devotions.writtenBy', { author: this.getPublisherLabel() });
  }

  getParagraphs(value: string | null | undefined): string[] {
    const normalized = value?.replace(/\r\n/g, '\n').trim() ?? '';
    if (!normalized) {
      return [];
    }

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }

  canShareDevotional(): boolean {
    return !this.loading && !this.notFound && !this.errorMessage && !!this.devotional && !this.sharing;
  }

  readonly shareDevotionalFromHeader = async (): Promise<void> => {
    await this.shareDevotional();
  };

  async shareDevotional(): Promise<void> {
    if (!this.devotional || this.loading || this.sharing) {
      return;
    }

    const shareTitle = this.devotional.title.trim();
    const shareText = this.buildShareText();
    if (!shareTitle || !shareText) {
      await this.appToast.error(this.localeService.translate('devotions.shareUnavailable'));
      return;
    }

    this.sharing = true;

    try {
      if (this.isNativePlatform()) {
        await this.shareOnNative(shareTitle, shareText);
        return;
      }

      const navigatorShare = this.getNavigatorShare();
      if (navigatorShare) {
        await navigatorShare({ title: shareTitle, text: shareText });
        return;
      }

      const copied = await this.copyShareTextToClipboard(shareText);
      if (copied) {
        await this.appToast.success(this.localeService.translate('devotions.shareCopied'));
        return;
      }

      await this.appToast.error(this.localeService.translate('devotions.shareFailed'));
    } catch (error) {
      if (this.isShareCancelError(error)) {
        return;
      }

      const copied = await this.copyShareTextToClipboard(shareText);
      if (copied) {
        await this.appToast.success(this.localeService.translate('devotions.shareCopied'));
        return;
      }

      await this.appToast.error(this.localeService.translate('devotions.shareFailed'));
    } finally {
      this.sharing = false;
    }
  }

  buildShareText(): string {
    if (!this.devotional) {
      return '';
    }

    const sections = [
      this.normalizeShareValue(this.devotional.title),
      this.normalizeShareValue(this.devotional.scripture_reference),
      this.normalizeShareValue(this.devotional.scripture_text),
      this.localeService.translate('devotions.shareAppCopy'),
    ].filter((value): value is string => !!value);

    return sections.join('\n\n');
  }

  private applyDevotional(devotional: DevotionalPublicDetail): void {
    this.devotional = devotional;
    this.contentParagraphs = this.getParagraphs(devotional.content);
    this.reflectionParagraphs = this.getParagraphs(devotional.reflection_question);
    this.prayerParagraphs = this.getParagraphs(devotional.prayer);
  }

  private parsePublicationDate(value: string): Date | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    const [, yearValue, monthValue, dayValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  private getValidatedSlug(): string | null {
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    const normalizedSlug = rawSlug?.trim() ?? '';
    return normalizedSlug || null;
  }

  private normalizeShareValue(value: string | null | undefined): string | null {
    const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
    return normalized || null;
  }

  private async shareOnNative(title: string, text: string): Promise<void> {
    const canShare = await this.canNativeShare();
    if (!canShare) {
      throw new Error('native-share-unavailable');
    }

    await this.nativeShare({
      title,
      text,
      dialogTitle: this.localeService.translate('devotions.shareDialogTitle'),
    });
  }

  private async canNativeShare(): Promise<boolean> {
    const canShare = await Share.canShare();
    return !!canShare.value;
  }

  private async nativeShare(options: { title: string; text: string; dialogTitle: string }): Promise<void> {
    await Share.share(options);
  }

  private getNavigatorShare():
    | ((data: { title?: string; text?: string; url?: string }) => Promise<void>)
    | null {
    const navigatorRef = globalThis.navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };

    return typeof navigatorRef.share === 'function' ? navigatorRef.share.bind(navigatorRef) : null;
  }

  private async copyShareTextToClipboard(text: string): Promise<boolean> {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) {
      return false;
    }

    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  private isShareCancelError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const message = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';

    return /cancel/i.test(message);
  }

  private resolveLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.localeService.translate('devotions.detailOfflineError');
    }

    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();
    if (message.includes('timeout')) {
      return this.localeService.translate('devotions.detailTimeoutError');
    }

    return this.localeService.translate('devotions.detailLoadErrorTitle');
  }

  private getDateLocale(): string {
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
