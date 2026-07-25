import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyDownloadService } from '../../core/services/bible-study-download.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { BibleStudyDetailPage } from './bible-study-detail.page';

describe('BibleStudyDetailPage', () => {
  let fixture: ComponentFixture<BibleStudyDetailPage>;
  let page: BibleStudyDetailPage;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let downloadService: jasmine.SpyObj<BibleStudyDownloadService>;
  let router: jasmine.SpyObj<Router>;
  let toastController: jasmine.SpyObj<ToastController>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let toastElement: { present: jasmine.Spy<() => Promise<void>> };

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
        { provide: BibleStudyDownloadService, useValue: downloadService },
        { provide: Router, useValue: router },
        { provide: ToastController, useValue: toastController },
        { provide: StackNavigationService, useValue: stackNavigationService },
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
    downloadService = jasmine.createSpyObj<BibleStudyDownloadService>('BibleStudyDownloadService', ['downloadPdf']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { events: of() });
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    toastElement = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    };
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

  it('shows Read in App and Download PDF actions', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Read in App');
    expect(text).toContain('Download PDF');
  });

  it('configures the detail header to fall back to the list page when there is no history', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(fixture.debugElement.query(By.directive(FeaturePageShellComponent))).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="feature-page-surface"]')).not.toBeNull();
    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;
    expect(header.title).toBe('Bible Study');
    expect(header.subtitle).toBe('Read published manual details.');
    expect(header.fallbackRoute).toBe('/bible-study');
    expect(header.showBack).toBeTrue();
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

  it('disables the PDF actions when the API response has no pdf_url', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: null }));

    await createComponent();

    const readButton = fixture.nativeElement.querySelector('[data-testid="open-pdf-button"]') as HTMLButtonElement;
    const downloadButton = fixture.nativeElement.querySelector('[data-testid="download-pdf-button"]') as HTMLButtonElement;
    expect(readButton.disabled).toBeTrue();
    expect(downloadButton.disabled).toBeTrue();
  });

  it('navigates to the in-app reader route', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    const card = fixture.nativeElement.querySelector('[data-testid="manual-detail"]') as HTMLButtonElement;
    card.click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/14/read');
  });

  it('uses the same reader navigation when Read in App is tapped', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    const readButton = fixture.nativeElement.querySelector('[data-testid="open-pdf-button"]') as HTMLButtonElement;
    readButton.click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/14/read');
  });

  it('does not navigate to the reader when pdf_url is missing', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: null }));

    await createComponent();
    await page.openReader();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('downloads using a freshly fetched pdf url', async () => {
    const refreshedManual = { ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=fresh-download' };
    bibleStudyService.getPublishedManualDetail.and.returnValues(of(manual), of(refreshedManual));
    downloadService.downloadPdf.and.resolveTo({
      fileName: 'manual.pdf',
      locationLabel: 'your device share sheet',
      shared: true,
    });
    const localStorageSpy = spyOn(window.localStorage, 'setItem');
    const sessionStorageSpy = spyOn(window.sessionStorage, 'setItem');

    await createComponent();
    await page.downloadPdf();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(downloadService.downloadPdf).toHaveBeenCalledWith(
      'https://example.com/manual.pdf?X-Amz-Signature=fresh-download',
      jasmine.stringMatching(/bible-study-manual-2026-english\.pdf/)
    );
    expect(toastController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'manual.pdf is ready from your device share sheet.',
        icon: 'checkmark-circle-outline',
      })
    );
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();
  });

  it('keeps Download PDF isolated from reader navigation', async () => {
    const refreshedManual = { ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=fresh-download' };
    bibleStudyService.getPublishedManualDetail.and.returnValues(of(manual), of(refreshedManual));
    downloadService.downloadPdf.and.resolveTo({
      fileName: 'manual.pdf',
      locationLabel: 'your browser downloads',
    });

    await createComponent();
    const downloadButton = fixture.nativeElement.querySelector('[data-testid="download-pdf-button"]') as HTMLButtonElement;
    downloadButton.click();
    await fixture.whenStable();

    expect(downloadService.downloadPdf).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('prevents duplicate download taps while a download is in progress', async () => {
    let resolveDownload: (() => void) | undefined;
    const pendingDownload = new Promise<{ fileName: string; locationLabel: string }>((resolve) => {
      resolveDownload = () => resolve({ fileName: 'manual.pdf', locationLabel: 'your browser downloads' });
    });
    bibleStudyService.getPublishedManualDetail.and.returnValues(of(manual), of(manual));
    downloadService.downloadPdf.and.returnValue(pendingDownload);

    await createComponent();

    const firstCall = page.downloadPdf();
    const secondCall = page.downloadPdf();
    resolveDownload?.();
    await firstCall;
    await secondCall;

    expect(downloadService.downloadPdf.calls.count()).toBe(1);
  });

  it('shows an error toast when the download fails', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(of(manual), of(manual));
    downloadService.downloadPdf.and.rejectWith(new Error('download failed'));

    await createComponent();
    await page.downloadPdf();

    expect(toastController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'We could not download this manual right now. Please try again.',
        icon: 'alert-circle-outline',
      })
    );
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
