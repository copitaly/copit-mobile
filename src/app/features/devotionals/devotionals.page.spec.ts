import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { DevotionalPublicListItem } from '../../core/models/devotional.model';
import { PaginatedResponse } from '../../core/models/pagination.model';
import { AuthService } from '../../core/services/auth.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { DevotionalsPage } from './devotionals.page';

describe('DevotionalsPage', () => {
  let fixture: ComponentFixture<DevotionalsPage>;
  let page: DevotionalsPage;
  let devotionalService: jasmine.SpyObj<DevotionalService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let router: jasmine.SpyObj<Router>;

  const firstDevotional: DevotionalPublicListItem = {
    id: 11,
    title: 'Morning Grace',
    slug: 'morning-grace',
    scripture_reference: 'Psalm 23:1',
    author_name: 'Pastor John',
    cover_image: 'https://example.com/cover.jpg',
    publication_date: '2026-07-27',
  };

  const secondDevotional: DevotionalPublicListItem = {
    id: 12,
    title: 'Evening Peace',
    slug: 'evening-peace',
    scripture_reference: 'John 14:27',
    author_name: '',
    cover_image: null,
    publication_date: '2026-07-26',
  };

  const buildResponse = (
    results: DevotionalPublicListItem[],
    next: string | null = null
  ): PaginatedResponse<DevotionalPublicListItem> => ({
    count: results.length,
    next,
    previous: null,
    results,
  });

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DevotionalsPage],
      providers: [
        { provide: DevotionalService, useValue: devotionalService },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DevotionalsPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    devotionalService = jasmine.createSpyObj<DevotionalService>('DevotionalService', ['getDevotionals']);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/tabs/devotionals' });
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('calls the public devotionals service on load with page 1', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(devotionalService.getDevotionals).toHaveBeenCalledWith({ page: 1 });
  });

  it('renders the loading state before the first response resolves', async () => {
    const response$ = new Subject<PaginatedResponse<DevotionalPublicListItem>>();
    devotionalService.getDevotionals.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="loading-state"]')).not.toBeNull();
    response$.complete();
  });

  it('renders the editorial header and devotion cards with title, scripture reference, author, and publication date', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional, secondDevotional])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('.devotionals-header')).not.toBeNull();
    expect(text).toContain('Devotions');
    expect(text).toContain('Pause, reflect, and grow through daily Scripture.');
    expect(fixture.nativeElement.querySelector('[data-testid="featured-devotional-card"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="devotional-card"]').length).toBe(1);
    expect(text).toContain('Morning Grace');
    expect(text).toContain('Evening Peace');
    expect(text).toContain('Psalm 23:1');
    expect(text).toContain('Pastor John');
    expect(text).toContain('27 Jul 2026');
    expect(fixture.nativeElement.querySelector('.cop-page-header')).not.toBeNull();
  });

  it('keeps the featured devotional metadata compact when author_name is blank', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([secondDevotional])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="featured-devotional-meta"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('John 14:27John 14:27');
  });

  it('renders the cover image when present', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
    expect(image?.getAttribute('src')).toBe('https://example.com/cover.jpg');
    expect(image?.getAttribute('alt')).toBe('Morning Grace cover image');
  });

  it('uses the fallback treatment when the cover image is missing', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([secondDevotional])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-icon[name="book-outline"]')).not.toBeNull();
  });

  it('hides a broken image and falls back safely', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    page.handleCoverImageError(firstDevotional.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-icon[name="book-outline"]')).not.toBeNull();
  });

  it('renders the friendly empty state when no devotions are published', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No devotions have been published yet.'
    );
  });

  it('renders the error state and retries', async () => {
    devotionalService.getDevotionals.and.returnValues(
      throwError(() => new Error('network')),
      of(buildResponse([firstDevotional]))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load devotions right now."
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(page.devotionals.length).toBe(1);
    expect(devotionalService.getDevotionals.calls.count()).toBe(2);
  });

  it('reloads page 1 on pull to refresh', async () => {
    devotionalService.getDevotionals.and.returnValues(
      of(buildResponse([firstDevotional], 'https://example.com/api/public/devotionals/?page=2')),
      of(buildResponse([secondDevotional]))
    );

    await createComponent();

    const complete = jasmine.createSpy('complete');
    page.refresh({ detail: { complete } } as unknown as CustomEvent<{ complete: () => void }>);

    expect(devotionalService.getDevotionals).toHaveBeenCalledWith({ page: 1 });
    expect(devotionalService.getDevotionals.calls.count()).toBe(2);
    expect(complete).toHaveBeenCalled();
    expect(page.devotionals[0].id).toBe(12);
  });

  it('requests the next page and appends results without duplicates', async () => {
    devotionalService.getDevotionals.and.returnValues(
      of(buildResponse([firstDevotional], 'https://example.com/api/public/devotionals/?page=2')),
      of(buildResponse([firstDevotional, secondDevotional], null))
    );

    await createComponent();
    page.loadMore();

    expect(devotionalService.getDevotionals.calls.mostRecent().args).toEqual([
      undefined,
      'https://example.com/api/public/devotionals/?page=2',
    ]);
    expect(page.devotionals.map((devotional) => devotional.id)).toEqual([11, 12]);
  });

  it('does not request another page after next is null', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional], null)));

    await createComponent();
    page.loadMore();

    expect(devotionalService.getDevotionals.calls.count()).toBe(1);
  });

  it('prevents duplicate page loads while a next page request is in flight', async () => {
    const nextPage$ = new Subject<PaginatedResponse<DevotionalPublicListItem>>();
    devotionalService.getDevotionals.and.returnValues(
      of(buildResponse([firstDevotional], 'https://example.com/api/public/devotionals/?page=2')),
      nextPage$.asObservable()
    );

    await createComponent();

    page.loadMore();
    page.loadMore();

    expect(devotionalService.getDevotionals.calls.count()).toBe(2);
    nextPage$.complete();
  });

  it('keeps already loaded devotionals visible when pull-to-refresh fails', async () => {
    devotionalService.getDevotionals.and.returnValues(
      of(buildResponse([firstDevotional])),
      throwError(() => new Error('network down'))
    );

    await createComponent();

    const complete = jasmine.createSpy('complete');
    page.refresh({ detail: { complete } } as unknown as CustomEvent<{ complete: () => void }>);
    fixture.detectChanges();

    expect(page.devotionals.map((devotional) => devotional.id)).toEqual([11]);
    expect(page.errorMessage).toBe('');
    expect(page.loadMoreErrorMessage).toBe('You appear to be offline. Check your connection and try again.');
    expect(complete).toHaveBeenCalled();
  });

  it('preserves loaded items and shows a compact retry when a later page fails', async () => {
    devotionalService.getDevotionals.and.returnValues(
      of(buildResponse([firstDevotional], 'https://example.com/api/public/devotionals/?page=2')),
      throwError(() => new Error('later page failed'))
    );

    await createComponent();
    page.loadMore();
    fixture.detectChanges();

    expect(page.devotionals.length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="load-more-error"]')?.textContent).toContain(
      "We couldn't load more devotions right now."
    );
  });

  it('renders the plain editorial header without the shared blue hero shell or a back button', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('app-feature-page-shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('.devotionals-header__eyebrow')?.textContent).toContain('Devotions');
    expect(fixture.nativeElement.querySelector('ion-back-button')).toBeNull();
  });

  it('navigates to the devotion detail route when the featured devotion is tapped', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="featured-devotional-card"]') as HTMLButtonElement | null;
    button?.click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/devotionals/morning-grace');
  });

  it('renders recent devotions as an editorial reading list beneath the featured card', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional, secondDevotional])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Featured Devotion');
    expect(text).toContain('Recent Devotions');
    expect(text).toContain('Keep reading');
    expect(text).toContain('Read devotion');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="devotional-card"]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="featured-devotional-card"]')?.className).toContain('cop-card');
  });

  it('shows the caught-up state only when there are no more recent devotionals or additional pages', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional], null)));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="caught-up-state"]')?.textContent).toContain(
      "You're all caught up."
    );
  });

  it('does not show the caught-up state when another page is available', async () => {
    devotionalService.getDevotionals.and.returnValue(
      of(buildResponse([firstDevotional], 'https://example.com/api/public/devotionals/?page=2'))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="caught-up-state"]')).toBeNull();
  });

  it('prevents duplicate devotion navigation from rapid taps', async () => {
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    void page.openDevotional(firstDevotional);
    await page.openDevotional(firstDevotional);

    expect(router.navigateByUrl.calls.count()).toBe(1);

    resolveNavigation?.(true);
    await fixture.whenStable();
  });

  it('formats yyyy-mm-dd publication dates without timezone drift', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(page.formatPublicationDate('2026-07-29')).toBe('29 Jul 2026');
  });

  it('returns the raw publication date when it is malformed', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(page.formatPublicationDate('2026-99-99')).toBe('2026-99-99');
  });

  it('encodes the slug safely when building the detail route', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(page.getDevotionalDetailRoute('trusting god/faith')).toBe('/tabs/devotionals/trusting%20god%2Ffaith');
  });

  it('returns null for a blank devotional slug', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(page.getDevotionalDetailRoute('   ')).toBeNull();
  });

  it('does not navigate when the devotional slug is blank', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    await page.openDevotional({ ...firstDevotional, slug: '   ' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('exposes tappable devotional cards with accessible names', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="featured-devotional-card"]') as HTMLButtonElement | null;
    expect(button?.disabled).toBeFalse();
    expect(button?.getAttribute('aria-label')).toContain('Morning Grace');
    expect(page.getDevotionalDetailRoute(firstDevotional.slug)).toBe('/tabs/devotionals/morning-grace');
  });

  it('does not display internal or admin-only fields', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('published_at');
    expect(text).not.toContain('created_by');
    expect(text).not.toContain('draft');
    expect(text).not.toContain('archived');
  });
});
