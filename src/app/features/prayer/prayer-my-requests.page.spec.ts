import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { AppRoutingModule } from '../../app-routing.module';
import { AuthService } from '../../core/services/auth.service';
import { PrayerService } from '../../core/services/prayer.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MemberPrayerRequest } from '../../core/models/prayer.model';
import { PrayerMyRequestsPage } from './prayer-my-requests.page';

describe('PrayerMyRequestsPage routing', () => {
  async function configureRouteTest(authState: {
    isAuthenticatedSnapshot: boolean;
    accessTokenSnapshot: string | null;
    currentUserSnapshot: { id?: number; role: string } | null;
  }): Promise<Router> {
    await TestBed.configureTestingModule({
      imports: [AppRoutingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            ...authState,
            getCurrentUser: jasmine.createSpy().and.returnValue(of(authState.currentUserSnapshot)),
          },
        },
        {
          provide: SentryTelemetryService,
          useValue: {
            addFeatureBreadcrumb: jasmine.createSpy('addFeatureBreadcrumb'),
            captureFeatureError: jasmine.createSpy('captureFeatureError'),
          },
        },
      ],
    }).compileComponents();

    return TestBed.inject(Router);
  }

  it('member can access /prayer/my-requests', async () => {
    const router = await configureRouteTest({
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      currentUserSnapshot: { id: 1, role: 'member' },
    });
    const route = router.config.find((item) => item.path === 'prayer/my-requests');
    const guard = route?.canMatch?.[0] as (route: any, segments: any[]) => unknown;

    const result = TestBed.runInInjectionContext(() => guard(route, [] as never[]));

    expect(result).toBeTrue();
  });

  it('normalized member roles are allowed by the existing guard', async () => {
    const router = await configureRouteTest({
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      currentUserSnapshot: { id: 1, role: ' Member ' },
    });
    const route = router.config.find((item) => item.path === 'prayer/my-requests');
    const guard = route?.canMatch?.[0] as (route: any, segments: any[]) => unknown;

    const result = TestBed.runInInjectionContext(() => guard(route, [] as never[]));

    expect(result).toBeTrue();
  });

  it('guest is blocked by the existing guard', async () => {
    const router = await configureRouteTest({
      isAuthenticatedSnapshot: false,
      accessTokenSnapshot: null,
      currentUserSnapshot: null,
    });
    const route = router.config.find((item) => item.path === 'prayer/my-requests');
    const guard = route?.canMatch?.[0] as (route: any, segments: any[]) => unknown;

    const result = TestBed.runInInjectionContext(() => guard(route, [] as never[])) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('branch_admin is blocked by the existing guard', async () => {
    const router = await configureRouteTest({
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      currentUserSnapshot: { id: 2, role: 'branch_admin' },
    });
    const route = router.config.find((item) => item.path === 'prayer/my-requests');
    const guard = route?.canMatch?.[0] as (route: any, segments: any[]) => unknown;

    const result = TestBed.runInInjectionContext(() => guard(route, [] as never[])) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/prayer');
  });

  it('platform_admin is blocked by the existing guard', async () => {
    const router = await configureRouteTest({
      isAuthenticatedSnapshot: true,
      accessTokenSnapshot: 'token',
      currentUserSnapshot: { id: 3, role: 'platform_admin' },
    });
    const route = router.config.find((item) => item.path === 'prayer/my-requests');
    const guard = route?.canMatch?.[0] as (route: any, segments: any[]) => unknown;

    const result = TestBed.runInInjectionContext(() => guard(route, [] as never[])) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/prayer');
  });
});

describe('PrayerMyRequestsPage', () => {
  let fixture: ComponentFixture<PrayerMyRequestsPage>;
  let page: PrayerMyRequestsPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let router: jasmine.SpyObj<Router>;

  const basePrayer: MemberPrayerRequest = {
    id: 11,
    scope: 'global',
    church: null,
    category: 'personal',
    title: 'Strength for this week',
    request_text: 'Please pray for peace and strength this week.',
    visibility: 'private',
    status: 'pending',
    is_anonymous_publicly: false,
    resolved_at: null,
    created_at: '2026-07-21T15:00:00Z',
    updated_at: '2026-07-21T15:00:00Z',
  };

  const buildResponse = (results: MemberPrayerRequest[], next: string | null = null) => ({
    count: results.length,
    next,
    previous: null,
    results,
  });

  async function createComponent(): Promise<void> {
    const authState$ = new BehaviorSubject<boolean>(true);
    const currentUser$ = new BehaviorSubject<{ id: number; role: string } | null>({ id: 1, role: 'member' });

    await TestBed.configureTestingModule({
      imports: [PrayerMyRequestsPage],
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
            isAuthenticated$: authState$.asObservable(),
            currentUser$: currentUser$.asObservable(),
            isAuthenticatedSnapshot: true,
            currentUserSnapshot: { id: 1, role: 'member' },
            accessTokenSnapshot: 'token',
            getCurrentUser: jasmine.createSpy().and.returnValue(of({ id: 1, role: 'member' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrayerMyRequestsPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', ['getMyPrayerRequests', 'getMyPrayerRequest']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { url: '/prayer/my-requests' });
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
  });

  it('calls GET /api/members/me/prayer-requests/ through the service on load', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(prayerService.getMyPrayerRequests).toHaveBeenCalledWith({ page: 1 });
  });

  it('renders the title when present', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')?.textContent).toContain('Strength for this week');
  });

  it('removes the my submitted prayers intro card copy', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('My submitted prayers');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Track the status, visibility, and scope of prayer requests submitted while signed in.'
    );
  });

  it('renders cleanly when the title is missing', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([{ ...basePrayer, title: '' }])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="prayer-title"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="my-prayer-card"]').length).toBe(1);
  });

  it('renders the request preview and category label', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Please pray for peace and strength this week.');
    expect(text).toContain('Personal');
  });

  it('stores two loaded prayer requests and renders two prayer cards', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(buildResponse([basePrayer, { ...basePrayer, id: 12, title: 'Second prayer request' }], null))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(page.prayers.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="my-prayer-card"]').length).toBe(2);
  });

  it('does not hide loaded results when next is null', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer, { ...basePrayer, id: 12 }], null)));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(page.nextPageUrl).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="my-prayer-card"]').length).toBe(2);
  });

  it('all filter defaults do not client-filter server results away', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer, { ...basePrayer, id: 12 }], null)));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(page.selectedStatus).toBe('all');
    expect(page.selectedVisibility).toBe('all');
    expect(page.selectedScope).toBe('all');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="my-prayer-card"]').length).toBe(2);
  });

  it('shows COP Italy for global scope', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('COP Italy');
  });

  it('shows area context for area prayers', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(buildResponse([{ ...basePrayer, scope: 'area', church: { id: 2, name: 'Roma Nord', level: 'area' } }]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Roma Nord Area');
  });

  it('shows district context for district prayers', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(
        buildResponse([
          {
            ...basePrayer,
            scope: 'district',
            church: {
              id: 3,
              name: 'Milano Centro',
              level: 'district',
              area: { id: 8, name: 'Lombardia', level: 'area' },
            },
          },
        ])
      )
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Milano Centro District');
    expect(fixture.nativeElement.textContent).toContain('Lombardia Area');
  });

  it('shows local church context for local prayers', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(
        buildResponse([
          {
            ...basePrayer,
            scope: 'local',
            church: {
              id: 4,
              name: 'Torino Central',
              level: 'local',
              district: { id: 9, name: 'Torino', level: 'district' },
              area: { id: 10, name: 'Piemonte', level: 'area' },
            },
          },
        ])
      )
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Torino Central');
    expect(fixture.nativeElement.textContent).toContain('Torino District');
    expect(fixture.nativeElement.textContent).toContain('Piemonte Area');
  });

  it('maps each backend status to the expected label', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(
        buildResponse([
          { ...basePrayer, id: 1, status: 'pending' },
          { ...basePrayer, id: 2, status: 'approved' },
          { ...basePrayer, id: 3, status: 'rejected' },
          { ...basePrayer, id: 4, status: 'resolved' },
        ])
      )
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pending Review');
    expect(text).toContain('Approved');
    expect(text).toContain('Not Approved');
    expect(text).toContain('Resolved');
  });

  it('renders the private and public labels correctly', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(
      of(buildResponse([{ ...basePrayer, visibility: 'private' }, { ...basePrayer, id: 2, visibility: 'public' }]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Private');
    expect(text).toContain('Public');
  });

  it('renders the status, visibility, and scope filters', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="status-filter"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="visibility-filter"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="scope-filter"]')).not.toBeNull();
  });

  it('sends the status filter to the backend', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();
    prayerService.getMyPrayerRequests.calls.reset();

    page.onStatusChange('approved');

    expect(prayerService.getMyPrayerRequests).toHaveBeenCalledWith({ page: 1, status: 'approved' });
  });

  it('sends the visibility filter to the backend', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();
    prayerService.getMyPrayerRequests.calls.reset();

    page.onVisibilityChange('public');

    expect(prayerService.getMyPrayerRequests).toHaveBeenCalledWith({ page: 1, visibility: 'public' });
  });

  it('sends the scope filter to the backend', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();
    prayerService.getMyPrayerRequests.calls.reset();

    page.onScopeChange('local');

    expect(prayerService.getMyPrayerRequests).toHaveBeenCalledWith({ page: 1, scope: 'local' });
  });

  it('filter changes reset pagination and replace existing results', async () => {
    prayerService.getMyPrayerRequests.and.returnValues(
      of(buildResponse([basePrayer], 'https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2')),
      of(buildResponse([{ ...basePrayer, id: 22, status: 'approved', title: 'Answered prayer' }]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.onStatusChange('approved');
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
    expect(page.prayers[0].id).toBe(22);
    expect(page.nextPageUrl).toBeNull();
  });

  it('supports combined filters', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();
    prayerService.getMyPrayerRequests.calls.reset();

    page.onStatusChange('approved');
    page.onVisibilityChange('public');
    page.onScopeChange('district');

    expect(prayerService.getMyPrayerRequests.calls.mostRecent().args[0]).toEqual({
      page: 1,
      status: 'approved',
      visibility: 'public',
      scope: 'district',
    });
  });

  it('appends the next page of prayer requests', async () => {
    prayerService.getMyPrayerRequests.and.returnValues(
      of(buildResponse([basePrayer], 'https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2')),
      of(buildResponse([{ ...basePrayer, id: 12, title: 'Second card' }]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.loadMore();
    fixture.detectChanges();

    expect(page.prayers.map((item) => item.id)).toEqual([11, 12]);
  });

  it('prevents duplicate pagination requests', async () => {
    const nextPage$ = new Subject<ReturnType<typeof buildResponse>>();
    prayerService.getMyPrayerRequests.and.returnValues(
      of(buildResponse([basePrayer], 'https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2')),
      nextPage$.asObservable()
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.loadMore();
    page.loadMore();

    expect(prayerService.getMyPrayerRequests.calls.count()).toBe(2);
    nextPage$.next(buildResponse([{ ...basePrayer, id: 13 }]));
    nextPage$.complete();
  });

  it('stops pagination when next is null', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer], null)));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();
    prayerService.getMyPrayerRequests.calls.reset();

    page.loadMore();

    expect(prayerService.getMyPrayerRequests).not.toHaveBeenCalled();
  });

  it('renders the loading state', async () => {
    const list$ = new Subject<ReturnType<typeof buildResponse>>();
    prayerService.getMyPrayerRequests.and.returnValue(list$.asObservable());
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="loading-state"]')).not.toBeNull();
    list$.next(buildResponse([basePrayer]));
    list$.complete();
  });

  it('renders the empty state', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain('No prayer requests yet');
  });

  it('renders the filtered empty state and clears filters', async () => {
    prayerService.getMyPrayerRequests.and.returnValues(
      of(buildResponse([basePrayer])),
      of(buildResponse([])),
      of(buildResponse([basePrayer]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.onStatusChange('approved');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No prayer requests match these filters.'
    );

    page.resetFilters();
    fixture.detectChanges();

    expect(page.selectedStatus).toBe('all');
    expect(page.prayers.length).toBe(1);
  });

  it('renders the error state and retries', async () => {
    prayerService.getMyPrayerRequests.and.returnValues(
      throwError(() => new Error('network')),
      of(buildResponse([basePrayer]))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="error-state"]')?.textContent).toContain(
      "We couldn't load your prayer requests right now."
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
  });

  it('keeps loaded records visible if loading an additional page fails', async () => {
    prayerService.getMyPrayerRequests.and.returnValues(
      of(buildResponse([basePrayer], 'https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2')),
      throwError(() => new Error('network'))
    );
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.loadMore();
    fixture.detectChanges();

    expect(page.prayers.length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="load-more-error"]')?.textContent).toContain(
      "We couldn't load more prayer requests right now."
    );
  });

  it('navigates the empty-state submit action to /prayer/submit', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    page.goToSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/prayer/submit');
  });

  it('loads member prayer request detail when opening a card', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of({ ...basePrayer, resolved_at: '2026-07-22T15:00:00Z' }));

    await createComponent();

    page.openPrayerDetails(basePrayer);

    expect(prayerService.getMyPrayerRequest).toHaveBeenCalledWith(11);
    expect(page.selectedPrayerDetail?.resolved_at).toBe('2026-07-22T15:00:00Z');
  });

  it('opens prayer details from a prayer card', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of({ ...basePrayer, resolved_at: '2026-07-22T15:00:00Z' }));

    await createComponent();

    page.openPrayerDetails(basePrayer);
    fixture.detectChanges();

    expect(page.isDetailOpen).toBeTrue();
    expect(page.selectedPrayerDetail?.id).toBe(basePrayer.id);
  });

  it('does not render user email, phone, or moderated_by identity', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('user@example.com');
    expect(text).not.toContain('+39');
    expect(text).not.toContain('moderated_by');
  });

  it('does not try to match guest submissions client-side', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const serialized = page.prayers.map((item) => JSON.stringify(item)).join(' ');
    expect(serialized).not.toContain('submitter_name');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
  });

  it('does not render the temporary debug output', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="debug-banner"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('My Prayer Requests debug:');
  });

  it('keeps the prayer list inside the main light content structure without a fixed-height sheet rule', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const surface = fixture.nativeElement.querySelector('.my-prayers-surface') as HTMLElement | null;
    const feed = fixture.nativeElement.querySelector('.my-prayers-feed') as HTMLElement | null;

    expect(surface).not.toBeNull();
    expect(feed).not.toBeNull();
    expect(surface?.contains(feed as Node)).toBeTrue();
    expect(surface?.style.height).toBe('');
    expect(surface?.style.minHeight).toBe('');
    expect(surface?.style.position).toBe('');
  });

  it('preserves comfortable bottom safe-area padding for the final prayer card stack', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const content = fixture.nativeElement.querySelector('.my-prayers-surface__content') as HTMLElement | null;

    expect(content).not.toBeNull();
    expect(getComputedStyle(content as Element).paddingBottom).not.toBe('0px');
  });

  it('uses a light content surface beneath the prayer list instead of exposing the blue hero background', async () => {
    prayerService.getMyPrayerRequests.and.returnValue(of(buildResponse([basePrayer])));
    prayerService.getMyPrayerRequest.and.returnValue(of(basePrayer));

    await createComponent();

    const ionContent = fixture.nativeElement.querySelector('ion-content.my-prayers-content') as HTMLElement | null;
    const surface = fixture.nativeElement.querySelector('.my-prayers-surface') as HTMLElement | null;
    const surfaceContent = fixture.nativeElement.querySelector('.my-prayers-surface__content') as HTMLElement | null;

    expect(ionContent).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(surfaceContent).not.toBeNull();
    expect(getComputedStyle(surface as Element).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(surfaceContent as Element).overflow).not.toBe('hidden');
  });
});
