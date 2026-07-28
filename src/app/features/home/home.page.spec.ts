import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let page: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let router: jasmine.SpyObj<{ navigate: (commands: unknown[]) => Promise<boolean> }>;
  let authState$: BehaviorSubject<boolean>;
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
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
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

    page = new HomePage(
      authServiceStub as unknown as AuthService,
      {
        setBranch: jasmine.createSpy().and.returnValue(true),
      } as unknown as SelectedBranchService,
      router as never,
      {
        trackGiveNowTapped: jasmine.createSpy().and.resolveTo(),
        trackBranchSelected: jasmine.createSpy().and.resolveTo(),
        getUserType: jasmine.createSpy().and.returnValue('guest'),
      } as unknown as AnalyticsService
    );
  });

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
