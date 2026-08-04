import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { LocaleService } from '../../core/localization/locale.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let page: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let router: jasmine.SpyObj<Router>;
  let authState$: BehaviorSubject<boolean>;
  let devotionalService: jasmine.SpyObj<DevotionalService>;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let localeService: LocaleService;
  let authServiceStub: {
    isAuthenticated$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
    isAuthenticatedSnapshot: boolean;
    currentUserSnapshot: { first_name: string; recent_donations?: unknown[] } | null;
    getCurrentUser: jasmine.Spy;
    getSavedChurches: jasmine.Spy;
  };

  async function createComponent(): Promise<ComponentFixture<HomePage>> {
    const nextFixture = TestBed.createComponent(HomePage);
    page = nextFixture.componentInstance;
    nextFixture.detectChanges();
    await Promise.resolve();
    nextFixture.detectChanges();
    return nextFixture;
  }

  const featuredManual: BibleStudyManualListItem = {
    id: 11,
    title: 'Walking in Wisdom',
    year: 2026,
    language: 'en',
    language_display: 'English',
    volume: '2',
    start_week: 15,
    end_week: 22,
    cover_image_url: 'https://example.com/manual-cover.jpg',
    pdf_url: 'https://example.com/manual.pdf',
  };

  const todayDevotional: DevotionalPublicDetail = {
    id: 7,
    title: 'Steady Grace for Today',
    slug: 'steady-grace-for-today',
    scripture_reference: 'Isaiah 41:10',
    scripture_text: 'Fear thou not; for I am with thee.',
    content:
      'When the day feels heavy, remember that God does not step back from your weakness. He stays near, strengthens your hands, and gives peace for the next faithful step.',
    reflection_question: 'Where do you need courage today?',
    prayer: 'Lord, steady my heart.',
    author_name: 'admin admin',
    cover_image: 'https://example.com/devotional-cover.jpg',
    publication_date: '2026-07-28',
  };

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    devotionalService = jasmine.createSpyObj<DevotionalService>('DevotionalService', ['getTodayDevotional']);
    devotionalService.getTodayDevotional.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', ['getPublishedManuals']);
    bibleStudyService.getPublishedManuals.and.returnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [featuredManual],
      })
    );

    authServiceStub = {
      isAuthenticated$: authState$.asObservable(),
      isAuthenticatedSnapshot: false,
      currentUserSnapshot: null,
      getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
      getSavedChurches: jasmine.createSpy().and.returnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: DevotionalService, useValue: devotionalService },
        { provide: BibleStudyService, useValue: bibleStudyService },
        {
          provide: SelectedBranchService,
          useValue: {
            setBranch: jasmine.createSpy().and.returnValue(true),
          },
        },
        { provide: Router, useValue: router },
        {
          provide: AnalyticsService,
          useValue: {
            trackGiveNowTapped: jasmine.createSpy().and.resolveTo(),
            trackBranchSelected: jasmine.createSpy().and.resolveTo(),
            getUserType: jasmine.createSpy().and.returnValue('guest'),
          },
        },
        {
          provide: StackNavigationService,
          useValue: {
            backWithFallback: jasmine.createSpy().and.resolveTo(),
          },
        },
      ],
    });

    page = TestBed.runInInjectionContext(() => new HomePage());
    localeService = TestBed.inject(LocaleService);
  });

  it('renders the new greeting header and supporting copy', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Welcome back');
    expect(text).toContain('Find today');
    expect(fixture.nativeElement.querySelector('.cop-page-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cop-page-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.greet__actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-button"]')).toBeNull();
  });

  it('shows the latest Bible Study manual in the hero section', async () => {
    fixture = await createComponent();

    expect(bibleStudyService.getPublishedManuals).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="featured-manual-title"]')?.textContent).toContain(
      'Walking in Wisdom'
    );
    expect(fixture.nativeElement.textContent).toContain('Start Reading');
  });

  it('opens the featured manual detail route from the hero card', async () => {
    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="featured-manual-card"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11');
  });

  it('falls back to the Bible Study list when no featured manual exists', async () => {
    bibleStudyService.getPublishedManuals.and.returnValue(
      of({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    );

    fixture = await createComponent();
    page.openFeaturedManual();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/tabs/bible-study']);
  });

  it('renders the devotion card below the hero when a devotion is available', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();
    const sectionLabels = Array.from(fixture.nativeElement.querySelectorAll('.sec-head h2')).map(
      (node) => (node as HTMLElement).textContent?.trim() ?? ''
    );

    expect(sectionLabels).toEqual(['Daily Devotion']);
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
    expect(fixture.nativeElement.textContent).toContain('Isaiah 41:10');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Featured Bible Study"]')!.compareDocumentPosition(
        fixture.nativeElement.querySelector('[aria-label="Daily Devotion"]')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('uses the calm devotion card treatment with devotion CTA copy', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Daily Devotion');
    expect(fixture.nativeElement.textContent).toContain('Read devotion');
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-image"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]')?.className).toContain('cop-card');
  });

  it('opens the devotion detail route from the devotion card', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/devotionals/steady-grace-for-today');
  });

  it('shows a devotion empty state when none is available', async () => {
    devotionalService.getTodayDevotional.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-empty"]')?.textContent).toContain(
      "Today's devotion isn't available yet."
    );
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-empty"]')?.textContent).toContain(
      'Check back later today.'
    );
  });

  it('does not render the old Home quick actions section', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('Quick Actions');
    expect(fixture.nativeElement.querySelector('[data-testid="qa-prayer"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="qa-profile"]')).toBeNull();
  });

  it('renders the Community and Prayer utility card with both actions', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Community');
    expect(fixture.nativeElement.textContent).toContain("You're not walking this journey alone.");
    expect(fixture.nativeElement.textContent).toContain('Connect with your church family or share a prayer request.');
    expect(fixture.nativeElement.querySelector('[data-testid="request-prayer-button"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="community-button"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.utility')?.className).toContain('cop-card');
  });

  it('updates Home feature labels immediately when the locale changes while preserving backend titles', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();
    await localeService.setLocale('it', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ultimo studio biblico');
    expect(fixture.nativeElement.textContent).toContain('Devozione quotidiana');
    expect(fixture.nativeElement.textContent).toContain('Comunità');
    expect(fixture.nativeElement.textContent).toContain('Walking in Wisdom');

    await localeService.setLocale('fr', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dernière étude biblique');
    expect(fixture.nativeElement.textContent).toContain('Dévotion quotidienne');
    expect(fixture.nativeElement.textContent).toContain('Communauté');
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
  });

  it('opens Prayer and Community from the utility card', async () => {
    fixture = await createComponent();

    await page.goToPrayer();
    await Promise.resolve();
    await page.goToCommunity();
    await Promise.resolve();

    expect(router.navigateByUrl.calls.allArgs()).toContain(['/prayer']);
    expect(router.navigateByUrl.calls.allArgs()).toContain(['/community']);
  });

  it('does not render the old header utility icons', async () => {
    authState$.next(true);
    authServiceStub.isAuthenticatedSnapshot = true;

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[aria-label="Notifications coming soon"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-button"]')).toBeNull();
  });

  it('shows the authenticated greeting support text when a first name exists', async () => {
    authServiceStub.currentUserSnapshot = { first_name: 'Kojo' };

    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Peace be with you, Kojo.');
  });

  it('keeps the lower utility card focused on Prayer and Community even when a branch is selected', async () => {
    fixture = await createComponent();
    (page as unknown as { defaultBranch: unknown }).defaultBranch = {
      id: 9,
      name: 'Rome Central Assembly',
      branch_code: 'RCA',
      level: 'local',
      district: null,
      area: null,
      donations_enabled: true,
      is_active: true,
    };
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Request Prayer');
    expect(fixture.nativeElement.textContent).toContain('Community');
    expect(fixture.nativeElement.textContent).not.toContain('Rome Central Assembly');
  });

  it('keeps the upcoming service card hidden when no schedule data exists', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('Upcoming Service');
  });

  it('requests both Bible Study and devotion content without blocking the rest of the page', async () => {
    const devotionalResponse$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getTodayDevotional.and.returnValue(devotionalResponse$.asObservable());

    fixture = await createComponent();

    expect(bibleStudyService.getPublishedManuals).toHaveBeenCalled();
    expect(devotionalService.getTodayDevotional).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Community');
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-loading"]')).not.toBeNull();

    devotionalResponse$.complete();
  });

  it('completes pull-to-refresh on success', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));
    fixture = await createComponent();
    const complete = jasmine.createSpy().and.resolveTo();

    await page.handleRefresh({
      target: { complete },
    } as unknown as any);

    expect(complete).toHaveBeenCalled();
  });

  it('prevents duplicate navigation from rapid taps', async () => {
    fixture = await createComponent();

    page.goToPrayer();
    page.goToPrayer();

    expect(router.navigateByUrl.calls.count()).toBe(1);
  });
});
