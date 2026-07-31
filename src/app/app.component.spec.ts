import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

import { AppComponent } from './app.component';
import { AnalyticsService } from './core/services/analytics.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { HardwareBackCoordinatorService } from './core/services/hardware-back-coordinator.service';

describe('AppComponent', () => {
  let hardwareBackCoordinator: jasmine.SpyObj<HardwareBackCoordinatorService>;

  beforeEach(async () => {
    hardwareBackCoordinator = jasmine.createSpyObj<HardwareBackCoordinatorService>('HardwareBackCoordinatorService', ['initialize']);
    spyOn(Keyboard, 'setResizeMode').and.resolveTo();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: DeepLinkService, useValue: {} },
        {
          provide: AnalyticsService,
          useValue: {
            trackAppOpened: jasmine.createSpy('trackAppOpened').and.resolveTo(),
          },
        },
        { provide: HardwareBackCoordinatorService, useValue: hardwareBackCoordinator },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('wires the centralized hardware back coordinator after the router outlet is available', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(hardwareBackCoordinator.initialize).toHaveBeenCalledTimes(1);
    expect(hardwareBackCoordinator.initialize).toHaveBeenCalledWith(fixture.componentInstance.routerOutlet);
  });

  it('still renders on web without touching keyboard-native back logic', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(hardwareBackCoordinator.initialize).toHaveBeenCalledTimes(1);
  });
});
