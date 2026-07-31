import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
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
    title: 'English Bible Study',
    year: 2027,
    language: 'en',
    language_display: 'English',
    volume: '2',
    start_week: 27,
    end_week: 37,
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

  it('renders the editorial header copy and shared tab safe-area class', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('.bible-study-content')?.className).toContain('cop-content--tabs');
    expect(fixture.nativeElement.querySelector('.bible-study-shell')?.className).toContain('cop-page-shell');
    expect(text).toContain('Bible Study');
    expect(text).toContain("Grow in faith through God's Word through structured weekly manuals.");
  });

  it('renders published manual cards', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="manual-card"]').length).toBe(1);
  });

  it('removes the visible featured label and keeps the featured intro copy', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Start with the newest published manual available to read now.');
    expect(text).toContain('Manuals');
    expect(text).not.toContain('Featured Bible Study');
    expect(text).not.toContain('Available Manuals');
  });

  it('renders a continue-reading intro when an existing session snapshot matches a manual', async () => {
    sessionStorage.setItem(
      continueReadingStorageKey,
      JSON.stringify({ manualId: 11, currentPage: 7, totalPages: 20 })
    );
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pick up where you left off in your current manual.');
    expect(text).toContain('Resume Reading');
    expect(text).toContain('Page 7 of 20');
  });

  it('renders title, year, language, volume, and week range from loaded data', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('English Bible Study');
    expect(text).toContain('2027');
    expect(text).toContain('English');
    expect(text).toContain('Volume 2');
    expect(text).toContain('Weeks 27-37');
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

    expect(fixture.nativeElement.textContent).not.toContain('Volume 2');
  });

  it('adds a Volume label when the API returns a raw number-like volume value', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([{ ...firstManual, volume: '2' }])));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Volume 2');
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

  it('navigates to the reader route when a row is tapped', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    page.openManual(firstManual);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11/read');
  });

  it('opens the reader when the full featured card is tapped', async () => {
    sessionStorage.setItem(
      continueReadingStorageKey,
      JSON.stringify({ manualId: 11, currentPage: 7, totalPages: 20 })
    );
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const heroButton = fixture.nativeElement.querySelector('[data-testid="hero-card"] .mobile-hero-card') as HTMLButtonElement;
    heroButton.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11/read');
  });

  it('clicking the Start Reading CTA only triggers one navigation', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    const cta = fixture.nativeElement.querySelector('[data-testid="hero-card"] .mobile-hero-card__cta') as HTMLElement;
    cta.click();

    expect(router.navigateByUrl.calls.count()).toBe(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11/read');
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
