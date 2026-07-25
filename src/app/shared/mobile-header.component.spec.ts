import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { AuthService } from '../core/services/auth.service';
import { StackNavigationService } from '../core/services/stack-navigation.service';
import { MobileHeaderComponent } from './mobile-header.component';

describe('MobileHeaderComponent', () => {
  let fixture: ComponentFixture<MobileHeaderComponent>;
  let component: MobileHeaderComponent;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MobileHeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Test';
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], {
      url: '/branches',
    });
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('delegates back navigation to the shared stack navigation service', async () => {
    await createComponent();
    component.fallbackRoute = '/home';
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('button'));
    backButton.triggerEventHandler('click');

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/home');
  });

  it('uses the fallback route directly from the profile root special case', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MobileHeaderComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Profile';
    component.fallbackRoute = '/home';
    Object.defineProperty(router, 'url', { value: '/profile' });
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('button'));
    backButton.triggerEventHandler('click');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
    expect(stackNavigationService.backWithFallback).not.toHaveBeenCalled();
  });
});
