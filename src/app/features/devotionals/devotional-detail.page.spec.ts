import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
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
    expect(header.fallbackRoute).toBe('/devotionals');
    expect(header.backAriaLabel).toBe('Back to devotionals');
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
    expect(ionContent).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(ionContent?.className).toContain('feature-page-content');
    expect(ionContent?.className).toContain('devotional-detail-content');
  });

  it('rejects a blank slug without calling the API', async () => {
    devotionalService.getDevotionalBySlug.and.returnValue(of(devotional));

    await createComponent('   ');

    expect(devotionalService.getDevotionalBySlug).not.toHaveBeenCalled();
    expect(page.errorMessage).toBe('Invalid devotional link.');
  });
});
