import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { AuthService } from '../core/services/auth.service';
import { StackNavigationService } from '../core/services/stack-navigation.service';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;
  let component: PageHeaderComponent;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Header';
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('delegates back navigation to the shared stack navigation service', async () => {
    await createComponent();
    component.backFallbackRoute = '/home';
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.page-header__icon-button'));
    backButton.triggerEventHandler('click');

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/home');
  });

  it('uses the compact variant by default', async () => {
    await createComponent();

    expect(component.variant).toBe('compact');
    expect(fixture.nativeElement.querySelector('.page-header--compact')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.page-header__inner--compact')).not.toBeNull();
  });

  it('renders the hero variant when requested', async () => {
    await createComponent();
    component.variant = 'hero';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.page-header--hero')).not.toBeNull();
  });

  it('invokes the supplied profile action when the profile button is shown', async () => {
    await createComponent();
    const profileAction = jasmine.createSpy('profileAction').and.resolveTo();
    component.showBack = false;
    component.showProfile = true;
    component.profileAction = profileAction;
    fixture.detectChanges();

    const profileButton = fixture.debugElement.query(By.css('.page-header__icon-button'));
    profileButton.triggerEventHandler('click');
    await fixture.whenStable();

    expect(profileAction).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('falls back to the default profile route when no profile action is provided', async () => {
    await createComponent();
    component.showBack = false;
    component.showProfile = true;
    fixture.detectChanges();

    const profileButton = fixture.debugElement.query(By.css('.page-header__icon-button'));
    profileButton.triggerEventHandler('click');
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('hides the profile action when showProfile is false', async () => {
    await createComponent();

    expect(fixture.nativeElement.querySelectorAll('.page-header__icon-button').length).toBe(1);
  });
});
