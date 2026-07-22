import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { PrayerPage } from './prayer.page';

describe('PrayerPage', () => {
  let page: PrayerPage;
  let router: jasmine.SpyObj<{ navigateByUrl: (url: string) => Promise<boolean> }>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<{ role: string } | null>;

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<{ role: string } | null>(null);
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: authState$.asObservable(),
            currentUser$: currentUser$.asObservable(),
          },
        },
        { provide: Router, useValue: router },
      ],
    });
    page = TestBed.runInInjectionContext(() => new PrayerPage());
  });

  afterEach(() => {
    page.ngOnDestroy();
  });

  it('shows only public actions for guests', () => {
    page.ngOnInit();

    expect(page.showMemberAction).toBeFalse();
    expect(page.primaryActions.map((action) => action.route)).toEqual([
      '/prayer/submit',
      '/prayer/community',
    ]);
  });

  it('shows my prayer requests for authenticated members', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    expect(page.showMemberAction).toBeTrue();
  });

  it('shows my prayer requests when the member role casing is inconsistent', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ role: ' Member ' });

    expect(page.showMemberAction).toBeTrue();
  });

  it('does not show my prayer requests for authenticated non-members', () => {
    page.ngOnInit();
    authState$.next(true);
    currentUser$.next({ role: 'platform_admin' });

    expect(page.showMemberAction).toBeFalse();
  });

  it('navigates actions to their configured routes', () => {
    page.openAction('/prayer/community');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/prayer/community');
  });
});
