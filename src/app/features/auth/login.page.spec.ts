import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: NavController, useValue: jasmine.createSpyObj<NavController>('NavController', ['back']) },
        { provide: StackNavigationService, useValue: jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login'], {
      isAuthenticatedSnapshot: false,
      accessTokenSnapshot: null,
    });

    activatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };
  });

  it('renders the standalone auth layout shell with the shared login form', async () => {
    await createComponent();

    const authLayout = fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]') as HTMLElement | null;
    const loginFormShell = fixture.nativeElement.querySelector('[data-testid="login-form-shell"]') as HTMLElement | null;
    const loginFooter = fixture.nativeElement.querySelector('[data-testid="login-footer"]') as HTMLElement | null;

    expect(authLayout).not.toBeNull();
    expect(loginFormShell).not.toBeNull();
    expect(loginFooter).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="tabs-shell"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Welcome back');
    expect(fixture.nativeElement.textContent).toContain('Sign in to continue');
  });

  it('keeps the standalone login layout boxes non-zero to guard against blank-screen regressions', async () => {
    await createComponent();

    const authLayout = fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]') as HTMLElement | null;
    const loginFormShell = fixture.nativeElement.querySelector('[data-testid="login-form-shell"]') as HTMLElement | null;
    const loginFooter = fixture.nativeElement.querySelector('[data-testid="login-footer"]') as HTMLElement | null;

    expect(authLayout?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
    expect(loginFormShell?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
    expect(loginFooter?.getBoundingClientRect().height ?? 0).toBeGreaterThan(0);
  });

  it('redirects authenticated users away from the standalone login route', async () => {
    Object.defineProperty(authService, 'isAuthenticatedSnapshot', { value: true });
    activatedRoute.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/tabs/profile' });

    await createComponent();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/profile', { replaceUrl: true });
  });
});
