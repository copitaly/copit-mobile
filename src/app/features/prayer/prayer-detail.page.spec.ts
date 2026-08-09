import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { CommunityPrayerRequest, PrayerComment } from '../../core/models/prayer.model';
import { AppToastService } from '../../core/services/app-toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PrayerService } from '../../core/services/prayer.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { PrayerDetailPage } from './prayer-detail.page';

describe('PrayerDetailPage', () => {
  let fixture: ComponentFixture<PrayerDetailPage>;
  let page: PrayerDetailPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let appToast: jasmine.SpyObj<AppToastService>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<any>;

  const prayer: CommunityPrayerRequest = {
    id: 14,
    scope: 'local',
    church: {
      id: 3,
      name: 'Torino Central',
      level: 'local',
      district: { id: 6, name: 'Torino' },
      area: { id: 7, name: 'Piemonte' },
    },
    category: 'health',
    title: 'Healing',
    request_text: 'Please pray for healing and strength.',
    display_name: 'Anonymous',
    comment_count: 2,
    created_at: '2026-08-05T10:00:00Z',
  };

  const comments: PrayerComment[] = [
    {
      id: 1,
      author: { name: 'Maria' },
      comment_text: 'We are praying with you.',
      created_at: '2026-08-07T18:42:00Z',
    },
    {
      id: 2,
      author: { name: 'John Mensah' },
      comment_text: 'Amen.',
      created_at: '2026-08-07T18:45:00Z',
    },
  ];

  const buildCommentsResponse = (results: PrayerComment[], next: string | null = null) => ({
    count: results.length,
    next,
    previous: null,
    results,
  });

  async function createComponent(routeId = String(prayer.id)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PrayerDetailPage],
      providers: [
        { provide: PrayerService, useValue: prayerService },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AppToastService, useValue: appToast },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: authState$.asObservable(),
            currentUser$: currentUser$.asObservable(),
            isAuthenticatedSnapshot: false,
            currentUserSnapshot: null,
          },
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']),
        },
        {
          provide: NavController,
          useValue: jasmine.createSpyObj<NavController>('NavController', ['back']),
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: routeId }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrayerDetailPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', [
      'getCommunityPrayer',
      'getCommunityPrayerComments',
      'createCommunityPrayerComment',
      'reportPrayerRequest',
      'reportPrayerComment',
    ]);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    appToast = jasmine.createSpyObj<AppToastService>('AppToastService', ['success', 'error', 'warning', 'info', 'show']);
    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<any>(null);
  });

  it('renders the loading state before the first response resolves', async () => {
    const response$ = new Subject<CommunityPrayerRequest>();
    prayerService.getCommunityPrayer.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="loading-state"]')).not.toBeNull();
    expect(prayerService.getCommunityPrayer).toHaveBeenCalledWith(prayer.id);
    response$.complete();
  });

  it('loads and renders the public prayer detail with comments', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('[data-testid="prayer-detail"]')).not.toBeNull();
    expect(text).toContain('Healing');
    expect(text).toContain('Please pray for healing and strength.');
    expect(text).toContain('Anonymous');
    expect(text).toContain('Health');
    expect(text).toContain('Torino Central');
    expect(text).toContain('Torino District');
    expect(text).toContain('Piemonte Area');
    expect(text).toContain('5 Aug 2026');
    expect(text).toContain('Comments');
    expect(text).toContain('Maria');
    expect(text).toContain('We are praying with you.');
    expect(text).toContain('Shared by');
    expect(text).toContain('Prayer scope');
    expect(fixture.nativeElement.querySelector('[data-testid="comments-count-badge"]')?.textContent).toContain('2');
    expect(fixture.nativeElement.querySelector('[data-testid="prayer-request-label"]')?.textContent).toContain('Prayer Request');
    expect(fixture.nativeElement.querySelector('[data-testid="prayer-request-surface"]')?.textContent).not.toContain('Shared by');
  });

  it('loads comments for the prayer detail after loading the prayer', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    expect(prayerService.getCommunityPrayerComments).toHaveBeenCalledWith(prayer.id, undefined);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="comment-item"]').length).toBe(2);
  });

  it('renders the empty comments state when there are no comments', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of({ ...prayer, comment_count: 0 }));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="comments-count-badge"]')?.textContent).toContain('0');
    expect(fixture.nativeElement.querySelector('[data-testid="comments-empty-state"]')?.textContent).toContain(
      'No comments yet. Be the first to encourage them.'
    );
  });

  it('handles comments loading errors without hiding the prayer', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(throwError(() => new Error('comments failed')));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-detail"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="comments-error"]')?.textContent).toContain(
      "We couldn't load comments right now."
    );
  });

  it('retries loading comments independently', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValues(
      throwError(() => new Error('comments failed')),
      of(buildCommentsResponse(comments))
    );

    await createComponent();

    page.retryComments();
    fixture.detectChanges();

    expect(prayerService.getCommunityPrayerComments.calls.count()).toBe(2);
    expect(page.comments.length).toBe(2);
  });

  it('shows the guest composer with an optional name field', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="guest-name-field"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="comment-text-field"]')).not.toBeNull();
  });

  it('submits a guest comment with guest_name when supplied', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));
    prayerService.createCommunityPrayerComment.and.returnValue(
      of({
        id: 9,
        author: { name: 'Maria' },
        comment_text: 'Amen.',
        created_at: '2026-08-07T18:50:00Z',
      })
    );

    await createComponent();

    page.commentForm.patchValue({ guest_name: 'Maria', comment_text: 'Amen.' });
    page.submitComment();
    fixture.detectChanges();

    expect(prayerService.createCommunityPrayerComment).toHaveBeenCalledWith(prayer.id, {
      guest_name: 'Maria',
      comment_text: 'Amen.',
    });
    expect(page.comments[0].author.name).toBe('Maria');
    expect(page.prayer?.comment_count).toBe(3);
    expect(page.commentForm.controls.comment_text.value).toBe('');
    expect(page.commentForm.controls.guest_name.value).toBe('');
  });

  it('submits a guest comment without guest_name when blank', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));
    prayerService.createCommunityPrayerComment.and.returnValue(
      of({
        id: 10,
        author: { name: 'Anonymous' },
        comment_text: 'Amen.',
        created_at: '2026-08-07T18:51:00Z',
      })
    );

    await createComponent();

    page.commentForm.patchValue({ guest_name: '   ', comment_text: 'Amen.' });
    page.submitComment();

    expect(prayerService.createCommunityPrayerComment).toHaveBeenCalledWith(prayer.id, {
      comment_text: 'Amen.',
    });
  });

  it('prevents guest submission when the comment is blank', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));

    await createComponent();

    page.commentForm.patchValue({ comment_text: '   ' });
    page.submitComment();

    expect(prayerService.createCommunityPrayerComment).not.toHaveBeenCalled();
    expect(page.commentControlError('comment_text')).toBe('Comment is required.');
  });

  it('prevents submission when the comment exceeds 1000 characters', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));

    await createComponent();

    page.commentForm.patchValue({ comment_text: 'a'.repeat(1001) });
    fixture.detectChanges();

    expect(page.canSubmitComment).toBeFalse();
    expect(page.commentControlError('comment_text')).toBe('Keep your comment to 1000 characters or fewer.');
  });

  it('does not show the guest name field for authenticated members', async () => {
    authState$.next(true);
    currentUser$.next({ id: 7, role: 'member', can_use_member_app: true });
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));
    prayerService.createCommunityPrayerComment.and.returnValue(
      of({
        id: 11,
        author: { name: 'Member Name' },
        comment_text: 'Standing with you.',
        created_at: '2026-08-07T18:55:00Z',
      })
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="guest-name-field"]')).toBeNull();

    page.commentForm.patchValue({ comment_text: 'Standing with you.' });
    page.submitComment();

    expect(prayerService.createCommunityPrayerComment).toHaveBeenCalledWith(prayer.id, {
      comment_text: 'Standing with you.',
    });
    expect(page.prayer?.comment_count).toBe(3);
  });

  it('shows a neutral notice instead of a composer for authenticated admin-role users', async () => {
    authState$.next(true);
    currentUser$.next({ id: 8, role: 'branch_admin', can_use_member_app: true });
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-comment-message"]')?.textContent).toContain(
      'Commenting is available to members and guests.'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="post-comment-button"]')).toBeNull();
  });

  it('preserves entered text when comment submission fails', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));
    prayerService.createCommunityPrayerComment.and.returnValue(throwError(() => new Error('network')));

    await createComponent();

    page.commentForm.patchValue({ guest_name: 'Maria', comment_text: 'Amen.' });
    page.submitComment();

    expect(page.commentForm.controls.comment_text.value).toBe('Amen.');
    expect(page.commentForm.controls.guest_name.value).toBe('Maria');
    expect(page.commentSubmitMessage).toBe("We couldn't post your comment right now. Please try again.");
  });

  it('shows a friendly throttle message for 429 comment responses', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));
    prayerService.createCommunityPrayerComment.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 429, error: { detail: 'Too many attempts.' } }))
    );

    await createComponent();

    page.commentForm.patchValue({ comment_text: 'Amen.' });
    page.submitComment();

    expect(page.commentSubmitMessage).toBe("You're commenting a little too quickly. Please try again shortly.");
  });

  it('prevents duplicate comment submissions while posting', async () => {
    const submit$ = new Subject<PrayerComment>();
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));
    prayerService.createCommunityPrayerComment.and.returnValue(submit$.asObservable());

    await createComponent();

    page.commentForm.patchValue({ comment_text: 'Amen.' });
    page.submitComment();
    page.submitComment();

    expect(prayerService.createCommunityPrayerComment.calls.count()).toBe(1);
    submit$.complete();
  });

  it('omits the title block when the prayer has no title', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of({ ...prayer, title: '' }));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')).toBeNull();
  });

  it('shows a friendly unavailable state for 404 responses', async () => {
    prayerService.getCommunityPrayer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="not-found-state"]')?.textContent).toContain(
      'This prayer request is not available.'
    );
  });

  it('shows a retryable error state for non-404 failures', async () => {
    prayerService.getCommunityPrayer.and.returnValues(throwError(() => new Error('network')), of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load this prayer request right now."
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(prayerService.getCommunityPrayer.calls.count()).toBe(2);
    expect(page.prayer?.id).toBe(14);
  });

  it('shows an offline-specific error message when the request fails with status 0', async () => {
    prayerService.getCommunityPrayer.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await createComponent();

    expect(page.errorMessage).toBe('You appear to be offline. Check your connection and try again.');
  });

  it('shows a timeout-specific error message when the request times out', async () => {
    prayerService.getCommunityPrayer.and.returnValue(throwError(() => new Error('Timeout while loading prayer')));

    await createComponent();

    expect(page.errorMessage).toBe('Loading this prayer request timed out. Please try again.');
  });

  it('rejects an invalid prayer id without calling the API', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));

    await createComponent('invalid');

    expect(prayerService.getCommunityPrayer).not.toHaveBeenCalled();
    expect(page.errorMessage).toBe('Invalid prayer request link.');
  });

  it('prevents overlapping reload requests where practical', async () => {
    const response$ = new Subject<CommunityPrayerRequest>();
    prayerService.getCommunityPrayer.and.returnValue(response$.asObservable());

    await createComponent();

    page.retryLoad();

    expect(prayerService.getCommunityPrayer.calls.count()).toBe(1);
    response$.complete();
  });

  it('uses the community feed as the back-navigation fallback', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    const backButton = fixture.nativeElement.querySelector('ion-back-button') as HTMLElement | null;
    expect(backButton?.getAttribute('defaulthref')).toBe('/tabs/prayer/community');
    expect(backButton?.getAttribute('aria-label')).toBe('Back to Community Prayers');
  });

  it('does not display internal or admin-only fields', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    const text = fixture.nativeElement.textContent.toLowerCase();
    expect(text).not.toContain('moderated');
    expect(text).not.toContain('resolved');
    expect(text).not.toContain('user_id');
    expect(text).not.toContain('email');
  });

  it('does not duplicate category or submitted date in the metadata section', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    const metadataText = fixture.nativeElement.querySelector('.detail-meta')?.textContent ?? '';
    expect(metadataText).not.toContain('Category');
    expect(metadataText).not.toContain('Submitted');
    expect(metadataText).toContain('Shared by');
    expect(metadataText).toContain('Prayer scope');
  });

  it('renders a report action for the prayer request and visible comments', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="report-prayer-button"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="report-comment-button"]').length).toBe(2);
  });

  it('opens the report modal for the prayer request', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    page.openPrayerReport();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="report-modal"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Report this prayer');
  });

  it('requires a report reason before submitting', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));

    await createComponent();

    page.openPrayerReport();
    page.submitReport();

    expect(prayerService.reportPrayerRequest).not.toHaveBeenCalled();
  });

  it('submits a prayer report successfully and closes the modal', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));
    prayerService.reportPrayerRequest.and.returnValue(of({ id: 41, status: 'open' }));
    appToast.success.and.returnValue(Promise.resolve());

    await createComponent();

    page.openPrayerReport();
    page.reportForm.patchValue({ reason: 'spam', details: 'Repeated promotional posts.' });
    page.submitReport();

    expect(prayerService.reportPrayerRequest).toHaveBeenCalledWith(prayer.id, {
      reason: 'spam',
      details: 'Repeated promotional posts.',
    });
    expect(appToast.success).toHaveBeenCalledWith('Report submitted. Thank you for helping keep the community safe.');
    expect(page.reportModalOpen).toBeFalse();
  });

  it('submits a comment report successfully', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));
    prayerService.reportPrayerComment.and.returnValue(of({ id: 51, status: 'open' }));
    appToast.success.and.returnValue(Promise.resolve());

    await createComponent();

    page.openCommentReport(comments[0]);
    page.reportForm.patchValue({ reason: 'harassment' });
    page.submitReport();

    expect(prayerService.reportPrayerComment).toHaveBeenCalledWith(comments[0].id, {
      reason: 'harassment',
    });
    expect(appToast.success).toHaveBeenCalled();
  });

  it('keeps the report modal open and shows an error when reporting fails', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));
    prayerService.reportPrayerRequest.and.returnValue(throwError(() => new Error('network')));

    await createComponent();

    page.openPrayerReport();
    page.reportForm.patchValue({ reason: 'other' });
    page.submitReport();
    fixture.detectChanges();

    expect(page.reportModalOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="report-submit-error"]')?.textContent).toContain(
      "We couldn't submit your report right now. Please try again."
    );
  });

  it('prevents duplicate report submissions while posting', async () => {
    const submit$ = new Subject<{ id: number; status: 'open' | 'resolved' }>();
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));
    prayerService.getCommunityPrayerComments.and.returnValue(of(buildCommentsResponse(comments)));
    prayerService.reportPrayerRequest.and.returnValue(submit$.asObservable());

    await createComponent();

    page.openPrayerReport();
    page.reportForm.patchValue({ reason: 'spam' });
    page.submitReport();
    page.submitReport();

    expect(prayerService.reportPrayerRequest.calls.count()).toBe(1);
    submit$.complete();
  });
});
