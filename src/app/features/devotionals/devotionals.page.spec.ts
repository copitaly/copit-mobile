import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { PaginatedResponse } from '../../core/models/pagination.model';
import { DevotionalPublicListItem } from '../../core/models/devotional.model';
import { AuthService } from '../../core/services/auth.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
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
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/devotionals' });
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

  it('renders published devotional cards with title, scripture reference, author, and publication date', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelectorAll('[data-testid="devotional-card"]').length).toBe(1);
    expect(text).toContain('Morning Grace');
    expect(text).toContain('Psalm 23:1');
    expect(text).toContain('Pastor John');
    expect(text).toContain('27 Jul 2026');
  });

  it('hides the author row when author_name is blank', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([secondDevotional])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="devotional-author"]')).toBeNull();
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
    expect(fixture.nativeElement.querySelector('ion-icon[name="sunny-outline"]')).not.toBeNull();
  });

  it('hides a broken image and falls back safely', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    page.handleCoverImageError(firstDevotional.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('ion-icon[name="sunny-outline"]')).not.toBeNull();
  });

  it('renders the friendly empty state when no devotionals are published', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No devotionals have been published yet.'
    );
  });

  it('renders the error state and retries', async () => {
    devotionalService.getDevotionals.and.returnValues(
      throwError(() => new Error('network')),
      of(buildResponse([firstDevotional]))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load devotionals right now."
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
      "We couldn't load more devotionals right now."
    );
  });

  it('configures the list header to fall back to the home screen', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(fixture.debugElement.query(By.directive(FeaturePageShellComponent))).not.toBeNull();
    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;
    expect(header.title).toBe('Devotionals');
    expect(header.subtitle).toBe('Browse published devotionals.');
    expect(header.fallbackRoute).toBe('/home');
    expect(header.showBack).toBeTrue();
  });

  it('navigates to the devotional detail route when a card is tapped', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="devotional-card"]') as HTMLButtonElement | null;
    button?.click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/devotionals/morning-grace');
  });

  it('encodes the slug safely when building the detail route', async () => {
    devotionalService.getDevotionals.and.returnValue(of(buildResponse([firstDevotional])));

    await createComponent();

    expect(page.getDevotionalDetailRoute('trusting god/faith')).toBe('/devotionals/trusting%20god%2Ffaith');
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

    const button = fixture.nativeElement.querySelector('[data-testid="devotional-card"]') as HTMLButtonElement | null;
    expect(button?.disabled).toBeFalse();
    expect(button?.getAttribute('aria-label')).toContain('Morning Grace');
    expect(page.getDevotionalDetailRoute(firstDevotional.slug)).toBe('/devotionals/morning-grace');
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
