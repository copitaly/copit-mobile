import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { BibleStudyPage } from './bible-study.page';

describe('BibleStudyPage', () => {
  let fixture: ComponentFixture<BibleStudyPage>;
  let page: BibleStudyPage;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let router: jasmine.SpyObj<Router>;

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
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibleStudyPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', [
      'getPublishedManuals',
      'getPublishedManualDetail',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
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

  it('renders an empty state when there are no published manuals', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No Bible Study manuals yet'
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

  it('navigates to the placeholder detail route when a manual is tapped', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(of(buildResponse([firstManual])));

    await createComponent();

    page.openManual(firstManual);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11');
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
