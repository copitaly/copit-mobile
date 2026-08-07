import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { hasMemberRole } from '../../core/auth/member-app-access';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import {
  CommunityPrayerRequest,
  PrayerCategory,
  PrayerComment,
  PrayerCommentCreatePayload,
} from '../../core/models/prayer.model';
import { AuthService } from '../../core/services/auth.service';
import { PrayerService } from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const value = String(control.value ?? '').trim();
    return value ? null : { requiredTrimmed: true };
  };
}

function trimmedMaxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl) => {
    const value = String(control.value ?? '').trim();
    return value.length > maxLength
      ? { maxlength: { requiredLength: maxLength, actualLength: value.length } }
      : null;
  };
}

type FieldErrorMap = Record<string, string[]>;

const MAX_COMMENT_LENGTH = 1000;
const MAX_GUEST_NAME_LENGTH = 255;

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-detail',
  templateUrl: './prayer-detail.page.html',
  styleUrls: ['./prayer-detail.page.scss'],
})
export class PrayerDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly prayerService = inject(PrayerService);
  private readonly localeService = inject(LocaleService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  prayer: CommunityPrayerRequest | null = null;
  comments: PrayerComment[] = [];
  loading = true;
  notFound = false;
  errorMessage = '';
  commentsLoading = false;
  commentsErrorMessage = '';
  commentsLoadMoreErrorMessage = '';
  commentsSubmitting = false;
  commentSubmitMessage = '';
  commentFieldErrors: FieldErrorMap = {};
  commentsNextPageUrl: string | null = null;
  isAuthenticatedUser = false;
  currentUserRole: string | null = null;

  private requestInFlight = false;
  private commentsRequestId = 0;
  private lastRequestedId: number | null = null;

  readonly skeletonItems = [1, 2, 3, 4];
  readonly commentSkeletonItems = [1, 2];
  readonly maxCommentLength = MAX_COMMENT_LENGTH;
  readonly maxGuestNameLength = MAX_GUEST_NAME_LENGTH;

  readonly commentForm = this.formBuilder.group({
    guest_name: ['', [trimmedMaxLengthValidator(MAX_GUEST_NAME_LENGTH)]],
    comment_text: ['', [requiredTrimmedValidator(), trimmedMaxLengthValidator(MAX_COMMENT_LENGTH)]],
  });

  ngOnInit(): void {
    combineLatest([this.authService.isAuthenticated$, this.authService.currentUser$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isAuthenticated, user]) => {
        this.isAuthenticatedUser = !!isAuthenticated;
        this.currentUserRole = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : null;
      });

    this.loadPrayer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayedCommentCount(): number {
    if (this.prayer) {
      return Math.max(0, this.prayer.comment_count ?? 0);
    }
    return this.comments.length;
  }

  get commentCharacterCount(): number {
    return String(this.commentForm.controls.comment_text.value ?? '').trim().length;
  }

  get isAuthenticatedMember(): boolean {
    return this.isAuthenticatedUser && hasMemberRole(this.authService.currentUserSnapshot ?? { id: 0, role: this.currentUserRole ?? '' });
  }

  get showGuestComposer(): boolean {
    return !this.isAuthenticatedUser;
  }

  get showAdminCommentMessage(): boolean {
    return this.isAuthenticatedUser && !this.isAuthenticatedMember;
  }

  get canSubmitComment(): boolean {
    return (
      !this.commentsSubmitting &&
      (this.isAuthenticatedMember || this.showGuestComposer) &&
      this.commentForm.valid &&
      !!String(this.commentForm.controls.comment_text.value ?? '').trim()
    );
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
    this.comments = [];
    this.commentsNextPageUrl = null;
    this.commentsErrorMessage = '';
    this.commentsLoadMoreErrorMessage = '';

    this.prayerService.getCommunityPrayer(prayerId).subscribe({
      next: (prayer) => {
        if (this.lastRequestedId !== prayerId) {
          return;
        }

        this.prayer = prayer;
        this.loading = false;
        this.requestInFlight = false;
        this.loadComments();
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

  loadComments(pathOrUrl?: string): void {
    if (!this.prayer?.id) {
      return;
    }

    const requestId = ++this.commentsRequestId;
    const appending = !!pathOrUrl;
    this.commentsErrorMessage = appending ? this.commentsErrorMessage : '';
    this.commentsLoadMoreErrorMessage = '';
    this.commentsLoading = !appending;

    this.prayerService.getCommunityPrayerComments(this.prayer.id, pathOrUrl).subscribe({
      next: (response) => {
        if (requestId !== this.commentsRequestId) {
          return;
        }

        this.comments = appending ? this.mergeComments(this.comments, response.results) : response.results;
        this.commentsNextPageUrl = response.next;
        this.commentsLoading = false;
      },
      error: (error: unknown) => {
        if (requestId !== this.commentsRequestId) {
          return;
        }

        this.commentsLoading = false;
        if (appending) {
          this.commentsLoadMoreErrorMessage = this.resolveCommentsLoadErrorMessage(error);
          return;
        }

        this.commentsErrorMessage = this.resolveCommentsLoadErrorMessage(error);
      },
    });
  }

  retryLoad(): void {
    this.loadPrayer();
  }

  retryComments(): void {
    this.loadComments();
  }

  loadMoreComments(): void {
    if (!this.commentsNextPageUrl || this.commentsLoading) {
      return;
    }

    this.loadComments(this.commentsNextPageUrl);
  }

  submitComment(): void {
    if (!this.prayer || !this.canSubmitComment) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const payload: PrayerCommentCreatePayload = {
      comment_text: String(this.commentForm.controls.comment_text.value ?? '').trim(),
    };
    const guestName = String(this.commentForm.controls.guest_name.value ?? '').trim();
    if (this.showGuestComposer && guestName) {
      payload.guest_name = guestName;
    }

    this.commentsSubmitting = true;
    this.commentSubmitMessage = '';
    this.commentFieldErrors = {};

    this.prayerService.createCommunityPrayerComment(this.prayer.id, payload).subscribe({
      next: (comment) => {
        this.commentsSubmitting = false;
        this.comments = this.mergeComments(this.comments, [comment]);
        if (this.prayer) {
          this.prayer = {
            ...this.prayer,
            comment_count: (this.prayer.comment_count ?? 0) + 1,
          };
        }

        this.commentForm.patchValue({
          guest_name: this.showGuestComposer ? '' : this.commentForm.controls.guest_name.value,
          comment_text: '',
        });
        this.commentForm.markAsPristine();
        this.commentForm.markAsUntouched();
      },
      error: (error: unknown) => {
        this.commentsSubmitting = false;
        this.handleCommentSubmitError(error);
      },
    });
  }

  onCommentFieldInput(field: 'guest_name' | 'comment_text'): void {
    delete this.commentFieldErrors[field];
    this.commentSubmitMessage = '';
    this.commentForm.controls[field].updateValueAndValidity({ emitEvent: false });
  }

  commentControlError(field: 'guest_name' | 'comment_text'): string {
    const backendError = this.commentFieldErrors[field]?.[0];
    if (backendError) {
      return backendError;
    }

    const control = this.commentForm.controls[field];
    if (!control.touched) {
      return '';
    }

    if (control.hasError('requiredTrimmed')) {
      return this.localeService.translate('prayer.commentRequired');
    }

    if (control.hasError('maxlength')) {
      return field === 'guest_name'
        ? this.localeService.translate('prayer.commentNameTooLong', { count: this.maxGuestNameLength })
        : this.localeService.translate('prayer.commentTooLong', { count: this.maxCommentLength });
    }

    return '';
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

  formatCommentDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.localeService.translate('prayer.dateUnavailable');
    }

    return new Intl.DateTimeFormat(this.localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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

  private resolveCommentsLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.localeService.translate('prayer.commentsOfflineError');
    }

    return this.localeService.translate('prayer.commentsLoadError');
  }

  private handleCommentSubmitError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.commentSubmitMessage = this.localeService.translate('prayer.commentSubmitFailed');
      return;
    }

    if (error.status === 429) {
      this.commentSubmitMessage = this.localeService.translate('prayer.commentThrottleError');
      return;
    }

    if (error.status === 400 && error.error && typeof error.error === 'object') {
      const payload = error.error as Record<string, unknown>;
      const nextFieldErrors: FieldErrorMap = {};
      for (const field of ['guest_name', 'comment_text'] as const) {
        if (Array.isArray(payload[field])) {
          nextFieldErrors[field] = payload[field].map((message) => String(message));
        }
      }
      this.commentFieldErrors = nextFieldErrors;

      if (Array.isArray(payload['detail']) && payload['detail'][0]) {
        this.commentSubmitMessage = String(payload['detail'][0]);
      } else if (typeof payload['detail'] === 'string' && payload['detail']) {
        this.commentSubmitMessage = String(payload['detail']);
      } else if (!Object.keys(nextFieldErrors).length) {
        this.commentSubmitMessage = this.localeService.translate('prayer.commentValidationFallback');
      }
      return;
    }

    this.commentSubmitMessage = this.localeService.translate('prayer.commentSubmitFailed');
  }

  private mergeComments(existing: PrayerComment[], incoming: PrayerComment[]): PrayerComment[] {
    const commentsById = new Map<number, PrayerComment>();
    for (const comment of [...existing, ...incoming]) {
      commentsById.set(comment.id, comment);
    }
    return Array.from(commentsById.values());
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
