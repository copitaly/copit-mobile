import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { BibleStudyDetailPage } from './bible-study-detail.page';

describe('BibleStudyDetailPage', () => {
  let fixture: ComponentFixture<BibleStudyDetailPage>;
  let page: BibleStudyDetailPage;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let toastController: jasmine.SpyObj<ToastController>;
  let toastElement: { present: jasmine.Spy };

  const manual: BibleStudyManualDetail = {
    id: 14,
    title: 'Bible Study Manual',
    year: 2026,
    language: 'en',
    language_display: 'English',
    volume: 'Volume 1',
    start_week: 1,
    end_week: 4,
    publication_status: 'published',
    published_at: '2026-07-24T09:00:00Z',
    cover_image_url: 'https://example.com/cover.jpg',
    pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=secret',
  };

  async function createComponent(routeId = '14'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [BibleStudyDetailPage],
      providers: [
        { provide: BibleStudyService, useValue: bibleStudyService },
        { provide: ToastController, useValue: toastController },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: routeId }),
            },
          },
        },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BibleStudyDetailPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', ['getPublishedManualDetail']);
    toastElement = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
    toastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastController.create.and.returnValue(Promise.resolve(toastElement as never));
  });

  it('loads and renders the published manual detail', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(bibleStudyService.getPublishedManualDetail).toHaveBeenCalledWith(14);
    expect(text).toContain('Bible Study Manual');
    expect(text).toContain('2026');
    expect(text).toContain('English');
    expect(text).toContain('Volume 1');
    expect(text).toContain('Weeks 1-4');
    expect(fixture.nativeElement.querySelector('[data-testid="manual-detail"]')).not.toBeNull();
  });

  it('shows the generic error state and retries', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      throwError(() => new Error('network')),
      of(manual)
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load this manual"
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.manual?.id).toBe(14);
  });

  it('shows a friendly not found state for 404 responses', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="not-found-state"]')?.textContent).toContain(
      'Manual not found'
    );
  });

  it('disables the PDF action when the API response has no pdf_url', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: null }));

    await createComponent();

    const button = fixture.nativeElement.querySelector('[data-testid="open-pdf-button"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });

  it('opens the current signed PDF URL in a new browser tab', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));
    const windowOpenSpy = spyOn(window, 'open').and.returnValue({ closed: false } as Window);

    await createComponent();
    await page.openPdf();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://example.com/manual.pdf?X-Amz-Signature=secret',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('shows a toast if opening the PDF fails', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));
    spyOn(window, 'open').and.returnValue(null);

    await createComponent();
    await page.openPdf();

    expect(toastController.create).toHaveBeenCalled();
    expect(toastElement.present).toHaveBeenCalled();
  });

  it('renders Full year when the manual has no explicit week range', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(
      of({ ...manual, start_week: null, end_week: null, volume: ' ' })
    );

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Full year');
    expect(text).not.toContain('Volume 1');
  });

  it('shows an invalid id error without calling the API', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent('abc');

    expect(bibleStudyService.getPublishedManualDetail).not.toHaveBeenCalled();
    expect(page.errorMessage).toBe('Invalid Bible Study manual ID.');
  });
});
