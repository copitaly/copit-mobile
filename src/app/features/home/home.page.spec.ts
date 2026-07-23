import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let page: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let router: jasmine.SpyObj<{ navigate: (commands: unknown[]) => Promise<boolean> }>;
  let authState$: BehaviorSubject<boolean>;

  async function createComponent(): Promise<ComponentFixture<HomePage>> {
    const nextFixture = TestBed.createComponent(HomePage);
    nextFixture.detectChanges();
    await nextFixture.whenStable();
    nextFixture.detectChanges();
    return nextFixture;
  }

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: authState$.asObservable(),
            isAuthenticatedSnapshot: false,
            currentUserSnapshot: null,
            getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
            getSavedChurches: jasmine.createSpy().and.returnValue(of([])),
          },
        },
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
      ],
    });

    page = new HomePage(
      {
        isAuthenticated$: authState$.asObservable(),
        isAuthenticatedSnapshot: false,
        currentUserSnapshot: null,
        getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
        getSavedChurches: jasmine.createSpy().and.returnValue(of([])),
      } as unknown as AuthService,
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

  it('keeps branch navigation unchanged', () => {
    page.goToBranches();

    expect(router.navigate).toHaveBeenCalledWith(['/branches']);
  });

  it('keeps guest account navigation unchanged', () => {
    page.goToAccount(false);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('removes the coming soon heading and preview badge from the ministry feature section', async () => {
    fixture = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Coming Soon');
    expect(text).not.toContain('Preview');
  });

  it('renders ministry feature cards in the expected order', async () => {
    fixture = await createComponent();
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.coming-soon .feature-card h3')).map((node) =>
      (node as HTMLElement).textContent?.trim() ?? ''
    );

    expect(titles).toEqual(['Prayer Requests', 'Devotionals', 'Bible Study']);
  });
});
