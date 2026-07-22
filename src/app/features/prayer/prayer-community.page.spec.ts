import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AppRoutingModule } from '../../app-routing.module';
import { CommunityPrayerRequest } from '../../core/models/prayer.model';
import { PrayerService } from '../../core/services/prayer.service';
import { AuthService } from '../../core/services/auth.service';
import { PrayerCommunityPage } from './prayer-community.page';

describe('PrayerCommunityPage routing', () => {
  it('keeps /prayer/community publicly accessible without a route guard', async () => {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: false,
            accessTokenSnapshot: null,
            currentUserSnapshot: null,
            getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const route = router.config.find((item) => item.path === 'prayer/community');

    expect(route).toBeDefined();
    expect(route?.canMatch).toBeUndefined();
  });
});

describe('PrayerCommunityPage', () => {
  let fixture: ComponentFixture<PrayerCommunityPage>;
  let page: PrayerCommunityPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let router: jasmine.SpyObj<Router>;

  const firstPrayer: CommunityPrayerRequest = {
    id: 11,
    scope: 'global',
    church: null,
    category: 'personal',
    title: 'Strength for this week',
    request_text: 'Please pray for peace and strength this week.',
    display_name: 'Efua',
    created_at: '2026-07-21T15:00:00Z',
  };

  const buildResponse = (results: CommunityPrayerRequest[], next: string | null = null) => ({
    count: results.length,
    next,
    previous: null,
    results,
  });

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PrayerCommunityPage],
      providers: [
        {
          provide: PrayerService,
          useValue: prayerService,
        },
        {
          provide: Router,
          useValue: router,
        },
        {
          provide: Location,
          useValue: {
            back: jasmine.createSpy('back'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticatedSnapshot: false,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrayerCommunityPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', ['getCommunityPrayers']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/prayer/community' });
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('calls the prayer service on load and does not redirect guests to login', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    expect(prayerService.getCommunityPrayers).toHaveBeenCalledWith({ page: 1 });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('renders an approved prayer response as a card', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="community-card"]').length).toBe(1);
  });

  it('renders the title when present', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')?.textContent).toContain(
      'Strength for this week'
    );
  });

  it('omits the title block when the prayer has no title', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(buildResponse([{ ...firstPrayer, title: '' }]))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')).toBeNull();
  });

  it('renders the request text and display name', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Please pray for peace and strength this week.');
    expect(text).toContain('Efua');
  });

  it('renders Anonymous exactly as returned by the backend', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(buildResponse([{ ...firstPrayer, display_name: 'Anonymous' }]))
    );

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Anonymous');
  });

  it('shows a friendly category label', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Personal');
  });

  it('shows COP Italy for global scope', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('COP Italy');
  });

  it('shows area context for area prayers', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(
        buildResponse([
          {
            ...firstPrayer,
            scope: 'area',
            church: { id: 1, name: 'Roma Nord', level: 'area' },
          },
        ])
      )
    );

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Roma Nord Area');
  });

  it('shows district context for district prayers', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(
        buildResponse([
          {
            ...firstPrayer,
            scope: 'district',
            church: {
              id: 2,
              name: 'Milano Centro',
              level: 'district',
              area: { id: 5, name: 'Lombardia' },
            },
          },
        ])
      )
    );

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Milano Centro District');
    expect(fixture.nativeElement.textContent).toContain('Lombardia Area');
  });

  it('shows local church context for local prayers', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(
        buildResponse([
          {
            ...firstPrayer,
            scope: 'local',
            church: {
              id: 3,
              name: 'Torino Central',
              level: 'local',
              district: { id: 6, name: 'Torino' },
              area: { id: 7, name: 'Piemonte' },
            },
          },
        ])
      )
    );

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Torino Central');
    expect(fixture.nativeElement.textContent).toContain('Torino District');
    expect(fixture.nativeElement.textContent).toContain('Piemonte Area');
  });

  it('sends the category filter back to the service', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();
    prayerService.getCommunityPrayers.calls.reset();

    page.onCategoryChange('health');

    expect(prayerService.getCommunityPrayers).toHaveBeenCalledWith({ page: 1, category: 'health' });
  });

  it('sends the scope filter back to the service', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();
    prayerService.getCommunityPrayers.calls.reset();

    page.onScopeChange('local');

    expect(prayerService.getCommunityPrayers).toHaveBeenCalledWith({ page: 1, scope: 'local' });
  });

  it('resets pagination and replaces existing results when filters change', async () => {
    prayerService.getCommunityPrayers.and.returnValues(
      of(buildResponse([firstPrayer], 'http://localhost:8000/api/public/prayer-requests/?page=2')),
      of(buildResponse([{ ...firstPrayer, id: 22, category: 'health', title: 'Healing' }]))
    );

    await createComponent();

    page.onCategoryChange('health');
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
    expect(page.prayers[0].id).toBe(22);
    expect(page.nextPageUrl).toBeNull();
  });

  it('appends the next page of prayers', async () => {
    prayerService.getCommunityPrayers.and.returnValues(
      of(buildResponse([firstPrayer], 'http://localhost:8000/api/public/prayer-requests/?page=2')),
      of(buildResponse([{ ...firstPrayer, id: 12, title: 'Second card' }]))
    );

    await createComponent();

    page.loadMore();
    fixture.detectChanges();

    expect(page.prayers.map((item) => item.id)).toEqual([11, 12]);
  });

  it('prevents duplicate pagination requests', async () => {
    const nextPage$ = new Subject<ReturnType<typeof buildResponse>>();
    prayerService.getCommunityPrayers.and.returnValues(
      of(buildResponse([firstPrayer], 'http://localhost:8000/api/public/prayer-requests/?page=2')),
      nextPage$.asObservable()
    );

    await createComponent();

    page.loadMore();
    page.loadMore();

    expect(prayerService.getCommunityPrayers.calls.count()).toBe(2);
    nextPage$.next(buildResponse([{ ...firstPrayer, id: 15 }]));
    nextPage$.complete();
  });

  it('renders the empty state when there are no community prayers', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([])));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No community prayers yet'
    );
  });

  it('renders the filtered empty state and lets the user reset filters', async () => {
    prayerService.getCommunityPrayers.and.returnValues(
      of(buildResponse([firstPrayer])),
      of(buildResponse([])),
      of(buildResponse([firstPrayer]))
    );

    await createComponent();

    page.onCategoryChange('family');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState?.textContent).toContain('No prayers match these filters.');

    page.resetFilters();
    fixture.detectChanges();

    expect(page.selectedCategory).toBe('all');
    expect(page.prayers.length).toBe(1);
  });

  it('renders the error state and retries the feed', async () => {
    prayerService.getCommunityPrayers.and.returnValues(
      throwError(() => new Error('network')),
      of(buildResponse([firstPrayer]))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load community prayers right now."
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
    expect(prayerService.getCommunityPrayers.calls.count()).toBe(2);
  });

  it('navigates the submit action to the submit page', async () => {
    prayerService.getCommunityPrayers.and.returnValue(of(buildResponse([firstPrayer])));

    await createComponent();

    page.goToSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/prayer/submit');
  });

  it('does not intentionally render private or internal fields', async () => {
    prayerService.getCommunityPrayers.and.returnValue(
      of(
        buildResponse([
          {
            ...firstPrayer,
            display_name: 'Anonymous',
          } as CommunityPrayerRequest,
        ])
      )
    );

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('pending');
    expect(text).not.toContain('private');
    expect(text).not.toContain('moderated');
    expect(text).not.toContain('user@example.com');
  });

  it('keeps existing results visible if loading an additional page fails', async () => {
    prayerService.getCommunityPrayers.and.returnValues(
      of(buildResponse([firstPrayer], 'http://localhost:8000/api/public/prayer-requests/?page=2')),
      throwError(() => new Error('network'))
    );

    await createComponent();

    page.loadMore();
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="load-more-error"]')?.textContent).toContain(
      "We couldn't load more community prayers right now."
    );
  });
});
