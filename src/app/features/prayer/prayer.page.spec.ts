import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { PrayerPage } from './prayer.page';

describe('PrayerPage', () => {
  let page: PrayerPage;
  let fixture: { nativeElement: HTMLElement } | null;
  let router: jasmine.SpyObj<{ navigateByUrl: (url: string) => Promise<boolean> }>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<{ role: string } | null>;

  beforeEach(() => {
    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<{ role: string } | null>(null);
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [PrayerPage],
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
    fixture = null;
  });

  afterEach(() => {
    page.ngOnDestroy();
  });

  function createComponent(): HTMLElement {
    const componentFixture = TestBed.createComponent(PrayerPage);
    componentFixture.detectChanges();
    fixture = componentFixture;
    return componentFixture.nativeElement as HTMLElement;
  }

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

  it('removes the stay connected in prayer intro card', () => {
    const element = createComponent();

    expect(element.textContent).not.toContain('Stay connected in prayer');
    expect(element.textContent).not.toContain('OPEN TO EVERYONE');
  });

  it('still renders the public prayer action cards', () => {
    const element = createComponent();

    expect(element.textContent).toContain('Submit a Prayer Request');
    expect(element.textContent).toContain('Community Prayers');
  });

  it('keeps my prayer requests hidden for guests in the rendered template', () => {
    const element = createComponent();

    expect(element.textContent).not.toContain('My Prayer Requests');
  });

  it('renders my prayer requests for authenticated members', () => {
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    const element = createComponent();

    expect(element.textContent).toContain('My Prayer Requests');
  });
});
