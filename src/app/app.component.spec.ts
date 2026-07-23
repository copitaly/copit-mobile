import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { ActionSheetController, AlertController, ModalController, Platform } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AnalyticsService } from './core/services/analytics.service';
import { DeepLinkService } from './core/services/deep-link.service';

describe('AppComponent', () => {
  let subscribeWithPrioritySpy: jasmine.Spy;
  let registeredBackHandler: (() => void) | undefined;
  let unsubscribeSpy: jasmine.Spy;
  let modalController: jasmine.SpyObj<ModalController>;
  let alertController: jasmine.SpyObj<AlertController>;
  let actionSheetController: jasmine.SpyObj<ActionSheetController>;

  beforeEach(async () => {
    registeredBackHandler = undefined;
    unsubscribeSpy = jasmine.createSpy('unsubscribe');
    subscribeWithPrioritySpy = jasmine.createSpy('subscribeWithPriority').and.callFake((_priority: number, handler: () => void) => {
      registeredBackHandler = handler;
      return { unsubscribe: unsubscribeSpy };
    });

    modalController = jasmine.createSpyObj<ModalController>('ModalController', ['getTop']);
    modalController.getTop.and.resolveTo(undefined);
    alertController = jasmine.createSpyObj<AlertController>('AlertController', ['getTop']);
    alertController.getTop.and.resolveTo(undefined);
    actionSheetController = jasmine.createSpyObj<ActionSheetController>('ActionSheetController', ['getTop']);
    actionSheetController.getTop.and.resolveTo(undefined);
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
        {
          provide: Platform,
          useValue: {
            backButton: {
              subscribeWithPriority: subscribeWithPrioritySpy,
            },
          },
        },
        { provide: ModalController, useValue: modalController },
        { provide: AlertController, useValue: alertController },
        { provide: ActionSheetController, useValue: actionSheetController },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('registers a single Android hardware back handler on native Android', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');

    TestBed.createComponent(AppComponent);

    expect(subscribeWithPrioritySpy).toHaveBeenCalledTimes(1);
    expect(subscribeWithPrioritySpy).toHaveBeenCalledWith(-1, jasmine.any(Function));
  });

  it('does not register the Android back handler on web', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);

    TestBed.createComponent(AppComponent);

    expect(subscribeWithPrioritySpy).not.toHaveBeenCalled();
  });

  it('exits the native Android app at root when no overlay or back stack exists', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const fixture = TestBed.createComponent(AppComponent);
    const exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => false,
      pop: jasmine.createSpy('pop'),
    } as unknown as never;

    await (fixture.componentInstance as any).handleAndroidBackButton();

    expect(exitNativeAppSpy).toHaveBeenCalled();
  });

  it('pops Ionic navigation on nested pages instead of exiting', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const popSpy = jasmine.createSpy('pop').and.resolveTo(true);
    const fixture = TestBed.createComponent(AppComponent);
    const exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => true,
      pop: popSpy,
    } as unknown as never;

    await (fixture.componentInstance as any).handleAndroidBackButton();

    expect(popSpy).toHaveBeenCalled();
    expect(exitNativeAppSpy).not.toHaveBeenCalled();
  });

  it('does not navigate to login when authenticated users exit from home', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const fixture = TestBed.createComponent(AppComponent);
    const exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => false,
      pop: jasmine.createSpy('pop'),
    } as unknown as never;

    await (fixture.componentInstance as any).handleAndroidBackButton();

    expect(exitNativeAppSpy).toHaveBeenCalled();
  });

  it('dismisses an open modal before exiting the app', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const dismissSpy = jasmine.createSpy('dismiss').and.resolveTo(true);
    modalController.getTop.and.resolveTo({ dismiss: dismissSpy } as never);
    const fixture = TestBed.createComponent(AppComponent);
    const exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => false,
      pop: jasmine.createSpy('pop'),
    } as unknown as never;

    await (fixture.componentInstance as any).handleAndroidBackButton();

    expect(dismissSpy).toHaveBeenCalled();
    expect(exitNativeAppSpy).not.toHaveBeenCalled();
  });

  it('dismisses alerts and action sheets before exiting the app', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const alertDismissSpy = jasmine.createSpy('dismiss').and.resolveTo(true);
    const actionSheetDismissSpy = jasmine.createSpy('dismiss').and.resolveTo(true);

    alertController.getTop.and.resolveTo({ dismiss: alertDismissSpy } as never);
    let fixture = TestBed.createComponent(AppComponent);
    let exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => false,
      pop: jasmine.createSpy('pop'),
    } as unknown as never;
    await (fixture.componentInstance as any).handleAndroidBackButton();
    expect(alertDismissSpy).toHaveBeenCalled();
    expect(exitNativeAppSpy).not.toHaveBeenCalled();

    modalController.getTop.and.resolveTo(undefined);
    alertController.getTop.and.resolveTo(undefined);
    actionSheetController.getTop.and.resolveTo({ dismiss: actionSheetDismissSpy } as never);
    fixture = TestBed.createComponent(AppComponent);
    exitNativeAppSpy = spyOn<any>(fixture.componentInstance, 'exitNativeApp').and.callFake(() => undefined);
    fixture.componentInstance.routerOutlet = {
      canGoBack: () => false,
      pop: jasmine.createSpy('pop'),
    } as unknown as never;
    await (fixture.componentInstance as any).handleAndroidBackButton();
    expect(actionSheetDismissSpy).toHaveBeenCalled();
    expect(exitNativeAppSpy).not.toHaveBeenCalled();
  });

  it('unsubscribes the Android back handler on destroy', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const fixture = TestBed.createComponent(AppComponent);

    fixture.componentInstance.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
