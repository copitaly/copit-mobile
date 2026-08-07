import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';

import { CommunityPrayerRequest } from '../../core/models/prayer.model';
import { PrayerService } from '../../core/services/prayer.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { PrayerDetailPage } from './prayer-detail.page';

describe('PrayerDetailPage', () => {
  let fixture: ComponentFixture<PrayerDetailPage>;
  let page: PrayerDetailPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

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
    created_at: '2026-08-05T10:00:00Z',
  };

  async function createComponent(routeId = String(prayer.id)): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PrayerDetailPage],
      providers: [
        { provide: PrayerService, useValue: prayerService },
        { provide: StackNavigationService, useValue: stackNavigationService },
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
    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', ['getCommunityPrayer']);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
  });

  it('renders the loading state before the first response resolves', async () => {
    const response$ = new Subject<CommunityPrayerRequest>();
    prayerService.getCommunityPrayer.and.returnValue(response$.asObservable());

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="loading-state"]')).not.toBeNull();
    expect(prayerService.getCommunityPrayer).toHaveBeenCalledWith(prayer.id);
    response$.complete();
  });

  it('loads and renders the public prayer detail', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));

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
    expect(text).toContain('Shared by');
    expect(text).toContain('Prayer scope');
  });

  it('omits the title block when the prayer has no title', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of({ ...prayer, title: '' }));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')).toBeNull();
  });

  it('shows a friendly unavailable state for 404 responses', async () => {
    prayerService.getCommunityPrayer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="not-found-state"]')?.textContent).toContain(
      'This prayer request is not available.'
    );
  });

  it('shows a retryable error state for non-404 failures', async () => {
    prayerService.getCommunityPrayer.and.returnValues(throwError(() => new Error('network')), of(prayer));

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

    await createComponent();

    const backButton = fixture.nativeElement.querySelector('ion-back-button') as HTMLElement | null;
    expect(backButton?.getAttribute('defaulthref')).toBe('/tabs/prayer/community');
    expect(backButton?.getAttribute('aria-label')).toBe('Back to Community Prayers');
  });

  it('does not display internal or admin-only fields', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));

    await createComponent();

    const text = fixture.nativeElement.textContent.toLowerCase();
    expect(text).not.toContain('moderated');
    expect(text).not.toContain('resolved');
    expect(text).not.toContain('user_id');
    expect(text).not.toContain('email');
  });

  it('does not duplicate category or submitted date in the metadata section', async () => {
    prayerService.getCommunityPrayer.and.returnValue(of(prayer));

    await createComponent();

    const metadataText = fixture.nativeElement.querySelector('.detail-meta')?.textContent ?? '';
    expect(metadataText).not.toContain('Category');
    expect(metadataText).not.toContain('Submitted');
    expect(metadataText).toContain('Shared by');
    expect(metadataText).toContain('Prayer scope');
  });
});
