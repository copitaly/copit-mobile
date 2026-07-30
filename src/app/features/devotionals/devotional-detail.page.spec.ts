import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';

import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { AuthService } from '../../core/services/auth.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { DevotionalDetailPage } from './devotional-detail.page';

describe('DevotionalDetailPage', () => {
  let fixture: ComponentFixture<DevotionalDetailPage>;
  let page: DevotionalDetailPage;
  let devotionalService: jasmine.SpyObj<DevotionalService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let toastController: jasmine.SpyObj<ToastController>;
  let toastElement: { present: jasmine.Spy<() => Promise<void>> };

  const devotional: DevotionalPublicDetail = {
    id: 1,
    title: 'Trusting God in Uncertain Times',
    slug: 'trusting-god-in-uncertain-times',
    scripture_reference: 'Proverbs 3:5-6',
    scripture_text: 'Trust in the Lord with all your heart.\nLean not on your own understanding.',
    content: 'When uncertainty rises,\nremember that God remains steady.\n\nGod is present in every unsettled hour.',
    reflection_question: 'What worry do you need to surrender today?\n\nWhere have you seen God\'s faithfulness already?',
    prayer: 'Lord, keep my heart steady.\nTeach me to trust you fully.\n\nGive me peace today.',
    author_name: 'admin admin',
    cover_image: 'https://example.com/cover.jpg',
    publication_date: '2026-07-28',
  };

  async function createComponent(routeSlug = devotional.slug): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DevotionalDetailPage],
      providers: [
        { provide: DevotionalService, useValue: devotionalService },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: ToastController, useValue: toastController },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ slug: routeSlug }),
            },
          },
        },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DevotionalDetailPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    devotionalService = jasmine.createSpyObj<DevotionalService>('DevotionalService', ['getDevotionals', 'getDevotionalBySlug']);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    toastElement = {
      present: jasmine.createSpy().and.returnValue(Promise.resolve()),
    };
    toastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastController.create.and.returnValue(Promise.resolve(toastElement as never));
  });

  it('renders the loading state before the first response resolves', async () => {
    const response$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getDevotionalBySlug.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="loading-state"]')).not.toBeNull();
    expect(devotionalService.getDevotionalBySlug).toHaveBeenCalledWith(devotional.slug);
    response$.complete();
  });

  it('loads and renders the devotional detail', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Trusting God in Uncertain Times');
    expect(text).toContain('28 July 2026');
    expect(text).toContain('Proverbs 3:5-6');
    expect(text).toContain('Trust in the Lord with all your heart.');
    expect(text).toContain('When uncertainty rises,');
    expect(text).toContain('What worry do you need to surrender today?');
    expect(text).toContain('Lord, keep my heart steady.');
    expect(text).toContain('admin admin');
  });

  it('shows a graceful fallback when devotional content is blank', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of({
      ...devotional,
      content: '   ',
    }));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="content"]')?.textContent).toContain(
      'Content will be available soon.'
    );
  });

  it('preserves line breaks for scripture, content, reflection, and prayer blocks', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="scripture-text"]')?.className).toContain('preserve-lines');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="content"] .reading-paragraph').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="reflection-question"] .reading-paragraph').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="prayer"] .reading-paragraph').length).toBe(2);
  });

  it('hides optional sections when their values are blank', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of({
      ...devotional,
      scripture_text: ' ',
      reflection_question: '',
      prayer: null,
      author_name: ' ',
      cover_image: null,
    }));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="scripture-text"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reflection-section"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="prayer-section"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="author-section"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="cover-image"]')).toBeNull();
  });

  it('renders the cover image when present', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const cover = fixture.nativeElement.querySelector('[data-testid="cover-image"]') as HTMLElement | null;
    const image = fixture.nativeElement.querySelector('[data-testid="cover-image"] img') as HTMLImageElement | null;
    expect(cover?.className).toContain('detail-card--cover-landscape');
    expect(image?.getAttribute('src')).toBe('https://example.com/cover.jpg');
    expect(image?.getAttribute('alt')).toBe('Trusting God in Uncertain Times cover image');
  });

  it('removes the devotional badge and redundant devotional content heading', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(fixture.nativeElement.querySelector('.detail-card__eyebrow')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="content-section"] h3')).toBeNull();
  });

  it('keeps scripture, reflection, and prayer headings when populated', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="scripture-heading"]')?.textContent).toContain('Scripture');
    expect(fixture.nativeElement.querySelector('[data-testid="reflection-heading"]')?.textContent).toContain('Reflection');
    expect(fixture.nativeElement.querySelector('[data-testid="prayer-heading"]')?.textContent).toContain('Prayer');
  });

  it('renders the author as a quiet attribution without an author card heading', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="author-attribution"]')?.textContent).toContain(
      'Written by admin admin'
    );
    expect(fixture.nativeElement.textContent).not.toContain('Author');
  });

  it('hides a broken cover image safely', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();
    page.handleCoverImageError();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="cover-image"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows a friendly unavailable state for 404 responses', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="not-found-state"]')?.textContent).toContain(
      'This devotional is no longer available.'
    );
  });

  it('shows a retryable error state for non-404 failures', async () => {
    devotionalService.getDevotionalBySlug.and.returnValues(
      throwError(() => new Error('network')),
      of(devotional)
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load this devotional"
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(devotionalService.getDevotionalBySlug.calls.count()).toBe(2);
    expect(page.devotional?.id).toBe(1);
  });

  it('shows an offline-specific error message when the request fails with status 0', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    await createComponent();

    expect(page.errorMessage).toBe('You appear to be offline. Check your connection and try again.');
  });

  it('shows a timeout-specific error message when the request times out', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(
      throwError(() => new Error('Timeout while loading devotional'))
    );

    await createComponent();

    expect(page.errorMessage).toBe('Loading this devotional timed out. Please try again.');
  });

  it('prevents overlapping detail reload requests where practical', async () => {
    const response$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getDevotionalBySlug.and.returnValue(response$.asObservable());

    await createComponent();

    page.retryLoad();

    expect(devotionalService.getDevotionalBySlug.calls.count()).toBe(1);
    response$.complete();
  });

  it('configures the header back action to return to the devotionals list', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(fixture.debugElement.query(By.directive(FeaturePageShellComponent))).not.toBeNull();
    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;
    expect(header.title).toBe('Devotional');
    expect(header.subtitle).toBe('Read published devotional details.');
    expect(header.fallbackRoute).toBe('/tabs/devotionals');
    expect(header.backAriaLabel).toBe('Back to devotionals');
    expect(header.actionIcon).toBe('share-social-outline');
    expect(header.actionAriaLabel).toBe('Share devotional');
  });

  it('keeps the share button unavailable while the devotional is loading', async () => {
    const response$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getDevotionalBySlug.and.returnValue(response$.asObservable());

    await createComponent();

    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;
    expect(header.actionDisabled).toBeTrue();
    response$.complete();
  });

  it('builds share text with title, scripture reference, scripture text, and app copy only', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const shareText = page.buildShareText();
    expect(shareText).toContain('Trusting God in Uncertain Times');
    expect(shareText).toContain('Proverbs 3:5-6');
    expect(shareText).toContain('Trust in the Lord with all your heart. Lean not on your own understanding.');
    expect(shareText).toContain('Read more daily devotionals in the COP Italy app.');
    expect(shareText).not.toContain('When uncertainty rises,');
    expect(shareText).not.toContain('What worry do you need to surrender today?');
    expect(shareText).not.toContain('Lord, keep my heart steady.');
    expect(shareText).not.toContain('trusting-god-in-uncertain-times');
  });

  it('omits blank scripture reference and scripture text from share text cleanly', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of({
      ...devotional,
      scripture_reference: '   ',
      scripture_text: '',
    }));

    await createComponent();

    const shareText = page.buildShareText();
    expect(shareText).toBe(
      'Trusting God in Uncertain Times\n\nRead more daily devotionals in the COP Italy app.'
    );
  });

  it('invokes Capacitor Share on native platforms', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(true);
    spyOn<any>(page, 'canNativeShare').and.resolveTo(true);
    const shareSpy = spyOn<any>(page, 'nativeShare').and.resolveTo();
    await page.shareDevotional();

    expect(shareSpy).toHaveBeenCalledWith({
      title: 'Trusting God in Uncertain Times',
      text: page.buildShareText(),
      dialogTitle: 'Share devotional',
    });
  });

  it('does not treat a cancelled native share as an error', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(true);
    spyOn<any>(page, 'canNativeShare').and.resolveTo(true);
    spyOn<any>(page, 'nativeShare').and.rejectWith(new Error('Share canceled'));
    await page.shareDevotional();

    expect(toastController.create).not.toHaveBeenCalled();
  });

  it('prevents duplicate share taps while sharing is already in progress', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    const sharePromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(true);
    spyOn<any>(page, 'canNativeShare').and.resolveTo(true);
    const shareSpy = spyOn<any>(page, 'nativeShare').and.returnValue(sharePromise);
    void page.shareDevotional();
    await page.shareDevotional();

    expect(shareSpy.calls.count()).toBe(1);
  });

  it('uses navigator.share in supported browsers', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    const navigatorShare = jasmine.createSpy().and.resolveTo();
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: navigatorShare,
    });

    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(false);
    await page.shareDevotional();

    expect(navigatorShare).toHaveBeenCalledWith({
      title: 'Trusting God in Uncertain Times',
      text: page.buildShareText(),
    });
  });

  it('uses the clipboard fallback when Web Share is unavailable', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    const clipboardWriteText = jasmine.createSpy().and.resolveTo();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });

    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(false);
    await page.shareDevotional();

    expect(clipboardWriteText).toHaveBeenCalledWith(page.buildShareText());
    expect(toastController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Devotional copied to clipboard',
        cssClass: 'branch-save-toast',
      })
    );
  });

  it('shows a friendly error when browser sharing and clipboard both fail', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jasmine.createSpy().and.rejectWith(new Error('clipboard failed')),
      },
    });

    await createComponent();
    spyOn<any>(page, 'isNativePlatform').and.returnValue(false);
    await page.shareDevotional();

    expect(toastController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: "Sharing isn't available right now.",
        cssClass: 'branch-save-toast',
      })
    );
  });

  it('does not display internal or admin-only fields', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('published_at');
    expect(text).not.toContain('created_by');
    expect(text).not.toContain('draft');
    expect(text).not.toContain('archived');
  });

  it('reuses the shared feature-page shell for the blue header and white rounded content surface', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const ionContent = fixture.nativeElement.querySelector('ion-content.devotional-detail-content') as HTMLElement | null;
    const surface = fixture.nativeElement.querySelector('[data-testid="feature-page-surface"]') as HTMLElement | null;
    const hero = fixture.nativeElement.querySelector('.feature-page-shell__hero') as HTMLElement | null;
    expect(ionContent).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(ionContent?.className).toContain('feature-page-content');
    expect(ionContent?.className).toContain('devotional-detail-content');
  });

  it('keeps devotional cards inside the shared rounded content surface beneath the blue header shell', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    const hero = fixture.nativeElement.querySelector('.feature-page-shell__hero') as HTMLElement | null;
    const surface = fixture.nativeElement.querySelector('[data-testid="feature-page-surface"]') as HTMLElement | null;
    const article = fixture.nativeElement.querySelector('[data-testid="devotional-detail"]') as HTMLElement | null;

    expect(hero).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(article).not.toBeNull();
    expect(surface?.contains(article as Node)).toBeTrue();
    expect(getComputedStyle(hero as Element).backgroundImage).not.toBe('none');
    expect(getComputedStyle(surface as Element).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('rejects a blank slug without calling the API', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent('   ');

    expect(devotionalService.getDevotionalBySlug).not.toHaveBeenCalled();
    expect(page.errorMessage).toBe('Invalid devotional link.');
  });

  it('formats yyyy-mm-dd publication dates without timezone drift', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(page.formatPublicationDate('2026-07-29')).toBe('29 July 2026');
  });

  it('returns the raw publication date when it is malformed', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent();

    expect(page.formatPublicationDate('2026-99-99')).toBe('2026-99-99');
  });
});
