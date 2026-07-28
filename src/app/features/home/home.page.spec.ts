import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let page: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let router: jasmine.SpyObj<Router>;
  let authState$: BehaviorSubject<boolean>;
  let devotionalService: jasmine.SpyObj<DevotionalService>;
  let authServiceStub: {
    isAuthenticated$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
    isAuthenticatedSnapshot: boolean;
    currentUserSnapshot: { first_name: string } | null;
    getCurrentUser: jasmine.Spy;
    getSavedChurches: jasmine.Spy;
  };

  async function createComponent(): Promise<ComponentFixture<HomePage>> {
    const nextFixture = TestBed.createComponent(HomePage);
    page = nextFixture.componentInstance;
    nextFixture.detectChanges();
    await nextFixture.whenStable();
    nextFixture.detectChanges();
    return nextFixture;
  }

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    devotionalService = jasmine.createSpyObj<DevotionalService>('DevotionalService', ['getTodayDevotional']);
    devotionalService.getTodayDevotional.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
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
  });

  const todayDevotional: DevotionalPublicDetail = {
    id: 7,
    title: 'Steady Grace for Today',
    slug: 'steady-grace-for-today',
    scripture_reference: 'Isaiah 41:10',
    scripture_text: 'Fear thou not; for I am with thee.',
    content: 'When the day feels heavy, remember that God does not step back from your weakness. He stays near, strengthens your hands, and gives peace for the next faithful step.',
    reflection_question: 'Where do you need courage today?',
    prayer: 'Lord, steady my heart.',
    author_name: 'admin admin',
    cover_image: 'https://example.com/devotional-cover.jpg',
    publication_date: '2026-07-28',
  };

  it('navigates the home prayer entry to the prayer landing page', () => {
    page.goToPrayer();

    expect(router.navigate).toHaveBeenCalledWith(['/prayer']);
  });

  it('navigates the home Bible Study entry to the Bible Study page', () => {
    page.goToBibleStudy();

    expect(router.navigate).toHaveBeenCalledWith(['/bible-study']);
  });

  it('navigates the home Devotionals entry to the Devotionals page', () => {
    page.goToDevotionals();

    expect(router.navigate).toHaveBeenCalledWith(['/devotionals']);
  });

  it('keeps branch navigation unchanged', () => {
    page.goToBranches();

    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('keeps give navigation unchanged', () => {
    spyOn(page, 'handlePrimaryCta');

    page.goToGive();

    expect(page.handlePrimaryCta).toHaveBeenCalled();
  });

  it('keeps guest account navigation unchanged', () => {
    page.goToAccount(false);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('renders the new connection-focused hero copy', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Connect with Your Church');
    expect(text).toContain('Grow, give, pray, and stay connected with your church family.');
    expect(text).not.toContain('Give to Your Local Church');
    expect(text).not.toContain('Give Now');
  });

  it('uses the hero header variant on the home screen', async () => {
    fixture = await createComponent();

    const header = fixture.debugElement.query(By.directive(PageHeaderComponent))?.componentInstance as PageHeaderComponent;
    expect(header.variant).toBe('hero');
    expect(header.showProfile).toBeTrue();
    expect(header.showBack).toBeFalse();
  });

  it('renders feature cards in the expected order', async () => {
    fixture = await createComponent();
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.feature-grid .feature-card h3')).map((node) =>
      (node as HTMLElement).textContent?.trim() ?? ''
    );

    expect(titles).toEqual(['Give', 'Prayer Requests', 'Bible Study', 'Devotionals']);
  });

  it('requests today devotional data without blocking the rest of the home content', async () => {
    const response$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getTodayDevotional.and.returnValue(response$.asObservable());

    fixture = await createComponent();

    expect(devotionalService.getTodayDevotional).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Give');
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-loading"]')).not.toBeNull();

    response$.complete();
  });

  it("renders today's devotional directly below the hero when the endpoint returns 200", async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    const card = fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]') as HTMLElement | null;
    const hero = fixture.nativeElement.querySelector('.home-header-wrap') as HTMLElement | null;
    const quickActions = fixture.nativeElement.querySelector('.quick-actions-section') as HTMLElement | null;

    expect(fixture.nativeElement.textContent).toContain("TODAY'S DEVOTIONAL");
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
    expect(fixture.nativeElement.textContent).toContain('Isaiah 41:10');
    expect(card).not.toBeNull();
    expect(hero?.nextElementSibling).toBe(card?.parentElement);
    expect(card?.parentElement?.nextElementSibling).toBe(quickActions);
  });

  it('hides the section completely on a 404 response', async () => {
    devotionalService.getTodayDevotional.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain("TODAY'S DEVOTIONAL");
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-error"]')).toBeNull();
  });

  it('renders a compact retry state for non-404 failures', async () => {
    devotionalService.getTodayDevotional.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-error"]')?.textContent).toContain(
      "Today's devotional could not be loaded."
    );
  });

  it('retries the today devotional request when retry is tapped', async () => {
    devotionalService.getTodayDevotional.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500 })),
      of(todayDevotional)
    );

    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="today-devotional-retry"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(devotionalService.getTodayDevotional.calls.count()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Steady Grace for Today');
  });

  it('prevents duplicate today devotional requests while one is already in flight', async () => {
    const response$ = new Subject<DevotionalPublicDetail>();
    devotionalService.getTodayDevotional.and.returnValue(response$.asObservable());

    fixture = await createComponent();
    page.retryTodayDevotional();
    page.ionViewWillEnter();

    expect(devotionalService.getTodayDevotional.calls.count()).toBe(1);
    response$.complete();
  });

  it('omits the scripture reference when it is blank', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of({ ...todayDevotional, scripture_reference: '   ' }));

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-scripture"]')).toBeNull();
  });

  it('truncates long preview content cleanly', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    const preview = fixture.nativeElement.querySelector('[data-testid="today-devotional-preview"]')?.textContent?.trim() ?? '';
    expect(preview.endsWith('…')).toBeTrue();
    expect(preview.length).toBeLessThanOrEqual(141);
  });

  it('does not truncate short preview content unnecessarily', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of({ ...todayDevotional, content: 'Stay near to God today.' }));

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-preview"]')?.textContent).toContain(
      'Stay near to God today.'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-preview"]')?.textContent).not.toContain('…');
  });

  it('renders the cover image when present', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-image"] img')?.getAttribute('src')).toBe(
      'https://example.com/devotional-cover.jpg'
    );
  });

  it('falls back safely when the cover image is missing or broken', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of({ ...todayDevotional, cover_image: null }));

    fixture = await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-image-fallback"]')).not.toBeNull();

    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));
    fixture = await createComponent();
    page.handleTodayDevotionalImageError();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-image"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="today-devotional-image-fallback"]')).not.toBeNull();
  });

  it('does not display internal or admin-only devotional fields', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('reflection_question');
    expect(text).not.toContain('prayer');
    expect(text).not.toContain('author_name');
    expect(text).not.toContain('published_at');
  });

  it('opens the existing devotional detail route when the featured card is tapped', async () => {
    devotionalService.getTodayDevotional.and.returnValue(of(todayDevotional));

    fixture = await createComponent();

    (fixture.nativeElement.querySelector('[data-testid="today-devotional-card"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/devotionals/steady-grace-for-today'
    );
  });

  it('shows the personalized greeting when a first name is available', async () => {
    authServiceStub.currentUserSnapshot = { first_name: 'Kojo' };

    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Welcome back, Kojo');
  });

  it('falls back to Welcome when no first name is available', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).toContain('Welcome');
  });

  it('renders the expected feature subtitles', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Tithes & Offerings');
    expect(text).toContain('Share & Pray');
    expect(text).toContain('Weekly manuals');
    expect(text).toContain('Daily encouragement');
  });

  it('shows the selected branch name when available', async () => {
    fixture = await createComponent();
    (page as any).defaultBranch = {
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

    expect(fixture.nativeElement.textContent).toContain('Rome Central Assembly');
  });

  it('hides the My Branch card when no branch has been chosen', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('My Branch');
    expect(fixture.nativeElement.querySelector('.branch-card')).toBeNull();
  });

  it('does not render the old branch selection instruction copy', async () => {
    fixture = await createComponent();

    expect(fixture.nativeElement.textContent).not.toContain('Select your branch');
  });
});
