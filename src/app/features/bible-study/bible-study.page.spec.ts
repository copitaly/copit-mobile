import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { BibleStudyPage } from './bible-study.page';

describe('BibleStudyPage', () => {
  const continueReadingStorageKey = 'copit.bible-study.progress';
  let fixture: ComponentFixture<BibleStudyPage>;
  let page: BibleStudyPage;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

  const firstManual: BibleStudyManualListItem = {
    id: 11,
    title: 'Bible Study Manual',
    year: 2026,
    language: 'en',
    language_display: 'English',
    volume: 'Volume 1',
    start_week: 1,
    end_week: 4,
    cover_image_url: 'https://example.com/cover.jpg',
    pdf_url: 'https://example.com/manual.pdf',
  };

  const buildResponse = (results: BibleStudyManualListItem[]) => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  });

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [BibleStudyPage],
      providers: [
        { provide: BibleStudyService, useValue: bibleStudyService },
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibleStudyPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    sessionStorage.removeItem(continueReadingStorageKey);
    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', [
      'getPublishedManuals',
      'getPublishedManualDetail',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('calls the public Bible Study service on load', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    expect(bibleStudyService.getPublishedManuals).toHaveBeenCalledWith();
  });

  it('renders published manual cards', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="manual-card"]').length).toBe(1);
  });

  it('renders the featured fallback hero when there is no reading progress', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Featured Bible Study');
    expect(text).toContain('Start Reading');
    expect(text).toContain('Choose a manual to read or download.');
    expect(text.match(/Featured Bible Study/g)?.length).toBe(1);
  });

  it('renders a Continue Reading hero when an existing session snapshot matches a manual', async () => {
    sessionStorage.setItem(
      continueReadingStorageKey,
      JSON.stringify({ manualId: 11, currentPage: 7, totalPages: 20 })
    );
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Continue Reading');
    expect(text).toContain('Resume Reading');
    expect(text).toContain('Page 7 of 20');
  });

  it('renders title, year, language, volume, and week range', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Bible Study Manual');
    expect(text).toContain('2026');
    expect(text).toContain('English');
    expect(text).toContain('Volume 1');
    expect(text).toContain('Weeks 1-4');
  });

  it('renders Full year when week range is missing', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(
      of(buildResponse([{ ...firstManual, start_week: null, end_week: null }]))
    );

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Full year');
  });

  it('does not render an empty volume row when volume is blank', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([{ ...firstManual, volume: ' ' }])));

    await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('Volume 1');
  });

  it('adds a Volume label when the API returns a raw number-like volume value', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([{ ...firstManual, volume: '1' }])));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Volume 1');
  });

  it('renders an empty state when there are no published manuals', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No Bible Studies Available'
    );
  });

  it('renders the error state and retries', async () => {
    bibleStudyService.getPublishedManuals.and.returnValues(
      throwError(() => new Error('network')),
      of(buildResponse([firstManual]))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load Bible Study manuals right now."
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(page.manuals.length).toBe(1);
    expect(bibleStudyService.getPublishedManuals.calls.count()).toBe(2);
  });

  it('keeps loaded manuals visible if pull-to-refresh fails', async () => {
    const complete = jasmine.createSpy('complete');
    bibleStudyService.getPublishedManuals.and.returnValues(
      of(buildResponse([firstManual])),
      throwError(() => new Error('network'))
    );

    await createComponent();

    page.refresh({ detail: { complete } } as unknown as CustomEvent<{ complete: () => void }>);
    fixture.detectChanges();

    expect(page.manuals.length).toBe(1);
    expect(page.errorMessage).toBe('');
    expect(page.loadMoreErrorMessage).toContain("couldn't refresh Bible Study manuals");
    expect(complete).toHaveBeenCalled();
  });

  it('prevents duplicate concurrent manual opens', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));
    let resolveNavigation: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise<boolean>((resolve) => {
        resolveNavigation = resolve;
      })
    );

    await createComponent();

    page.openManual(firstManual);
    page.openManual(firstManual);
    resolveNavigation?.(true);
    await fixture.whenStable();

    expect(router.navigateByUrl.calls.count()).toBe(1);
  });

  it('navigates to the placeholder detail route when a manual is tapped', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    page.openManual(firstManual);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11');
  });

  it('navigates straight to the reader when Continue Reading is available', async () => {
    sessionStorage.setItem(
      continueReadingStorageKey,
      JSON.stringify({ manualId: 11, currentPage: 7, totalPages: 20 })
    );
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    page.openHero();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11/read');
  });

  it('renders the top-level Bible Study header without a back button', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;
    expect(header.title).toBe('Bible Study');
    expect(header.subtitle).toBe("Grow in faith through God's Word");
    expect(header.fallbackRoute).toBe('/tabs/home');
    expect(header.showBack).toBeFalse();
    expect(fixture.nativeElement.querySelector('.app-header__back')).toBeNull();
  });

  it('does not intentionally render admin-only fields', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('draft');
    expect(text).not.toContain('archived');
    expect(text).not.toContain('created_by');
    expect(text).not.toContain('display_order');
  });
});
