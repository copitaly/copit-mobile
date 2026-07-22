import { BehaviorSubject, of } from 'rxjs';

import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let page: HomePage;
  let router: jasmine.SpyObj<{ navigate: (commands: unknown[]) => Promise<boolean> }>;
  let authState$: BehaviorSubject<boolean>;

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

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
});
