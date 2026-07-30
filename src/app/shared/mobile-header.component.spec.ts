import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';

import { StackNavigationService } from '../core/services/stack-navigation.service';
import { MobileHeaderComponent } from './mobile-header.component';

describe('MobileHeaderComponent', () => {
  let fixture: ComponentFixture<MobileHeaderComponent>;
  let component: MobileHeaderComponent;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MobileHeaderComponent],
      providers: [
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: NavController, useValue: jasmine.createSpyObj<NavController>('NavController', ['navigateBack']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Test';
    fixture.detectChanges();
  }

  beforeEach(() => {
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
  });

  it('delegates ion-back-button clicks to the shared stack navigation service', async () => {
    await createComponent();
    component.fallbackRoute = '/tabs/home';
    fixture.detectChanges();

    component.handleBackClick({
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
    } as unknown as Event);

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/tabs/home');
  });

  it('passes the fallback route through to the Ionic back button defaultHref', async () => {
    await createComponent();
    component.fallbackRoute = '/tabs/profile';
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('ion-back-button')).nativeElement as HTMLElement & {
      defaultHref?: string;
    };

    expect(backButton.defaultHref).toBe('/tabs/profile');
  });
});
