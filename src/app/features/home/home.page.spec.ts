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

  it('renders the dashboard greeting, navy top bar, and static banner', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Welcome back');
    expect(text).toContain('Peace be with you.');
    expect(fixture.nativeElement.querySelector('.home-topbar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.dashboard-banner img')?.getAttribute('src')).toContain('banner.png');
    expect(fixture.nativeElement.querySelector('[aria-label="Notifications coming soon"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-button"]')).toBeNull();
  });

  it('shows the offering feature card and four dashboard shortcuts', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('[data-testid="home-offering-card"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-feature-study"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-feature-devotions"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-feature-prayer"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="home-feature-community"]')).not.toBeNull();
    expect(text).toContain('Give an Offering');
    expect(text).toContain('Support your local church.');
    expect(text).toContain('Grow in the Word and knowledge.');
    expect(text).toContain('Daily inspiration for your walk.');
  });

  it('shows the latest header with a View All action and the compact Bible Study row', async () => {
    fixture = await createComponent();

    expect(bibleStudyService.getPublishedManuals).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="home-latest-view-all"]')?.textContent).toContain(
      'View All'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="home-latest-study"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="featured-manual-title"]')?.textContent).toContain(
      'Walking in Wisdom'
    );
    expect(fixture.nativeElement.textContent).toContain('Read');
  });

  it('routes the latest View All action to the Bible Study tab', async () => {
    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="home-latest-view-all"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/tabs/bible-study']);
  });

  it('formats featured Bible Study metadata with a middle-dot separator and correct week range', async () => {
    fixture = await createComponent();

    expect(page.featuredHeroMeta).toBe('2026 \u00b7 English \u00b7 Volume 2 \u00b7 Weeks 15\u201322');
    expect(page.featuredHeroMeta).not.toContain('\uFFFD');
  });

  it('opens the latest Bible Study reader route from the compact row', async () => {
    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="home-latest-study"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/11/read');
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

  it('renders the latest devotion row with compact copy when a devotion is available', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-empty"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
    expect(fixture.nativeElement.textContent).toContain('Fear thou not; for I am with thee.');
  });

  it('uses the actual Bible Study cover when available and falls back after an image error', async () => {
    fixture = await createComponent();

    expect(page.latestBibleStudyImage).toBe('https://example.com/manual-cover.jpg');

    page.handleFeaturedManualImageError();

    expect(page.latestBibleStudyImage).toBe('assets/img/cop-home-images/bible-study.png');
  });

  it('uses the actual devotion image when available and falls back after an image error', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));
    fixture = await createComponent();

    expect(page.latestDevotionImage).toBe('https://example.com/devotional-cover.jpg');

    page.handleTodayDevotionalImageError();

    expect(page.latestDevotionImage).toBe('assets/img/cop-home-images/daily-devotion.png');
  });

  it('opens the devotion detail route from the latest devotion row', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/devotionals/steady-grace-for-today');
  });

  it('shows a compact devotion empty state when none is available', async () => {
    devotionalService.getTodayDevotional.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-empty"]')?.textContent).toContain(
      'Not available yet'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-empty"]')?.textContent).toContain(
      'Check back later today.'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-browse"]')?.textContent).toContain(
      'Browse'
    );
  });

  it('routes the offering card through the existing offering flow', async () => {
    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="home-offering-card"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('routes the dashboard feature cards to the existing destinations', async () => {
    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="home-feature-study"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="home-feature-devotions"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="home-feature-prayer"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="home-feature-community"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(router.navigate.calls.allArgs()).toContain([['/tabs/bible-study']]);
    expect(router.navigateByUrl.calls.allArgs()).toContain(['/tabs/devotionals']);
    expect(router.navigateByUrl.calls.allArgs()).toContain(['/tabs/prayer']);
    expect(router.navigateByUrl.calls.allArgs()).toContain(['/tabs/prayer/community']);
  });

  it('updates dashboard labels immediately when the locale changes while preserving backend titles', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();
    await localeService.setLocale('it', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ultimi contenuti');
    expect(fixture.nativeElement.textContent).toContain('Studio biblico');
    expect(fixture.nativeElement.textContent).toContain('Devozioni');
    expect(fixture.nativeElement.textContent).toContain('Walking in Wisdom');

    await localeService.setLocale('fr', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Derniers contenus');
    expect(fixture.nativeElement.textContent).toContain('Étude biblique');
    expect(fixture.nativeElement.textContent).toContain('Dévotions');
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
  });

  it('shows the authenticated greeting title when a first name exists', async () => {
    authServiceStub.currentUserSnapshot = { first_name: 'Kojo' };

    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Welcome back, Kojo');
    expect(fixture.nativeElement.textContent).toContain('Peace be with you.');
  });

  it('requests both Bible Study and devotion content without blocking the rest of the dashboard', async () => {
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
