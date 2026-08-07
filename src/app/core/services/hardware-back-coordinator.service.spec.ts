import { TestBed } from '@angular/core/testing';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  ActionSheetController,
  AlertController,
  IonRouterOutlet,
  ModalController,
  Platform,
  PopoverController,
} from '@ionic/angular';
import { DefaultUrlSerializer, Router } from '@angular/router';

import { AppToastService } from './app-toast.service';
import { HardwareBackCoordinatorService } from './hardware-back-coordinator.service';

describe('HardwareBackCoordinatorService', () => {
  let service: HardwareBackCoordinatorService;
  let subscribeWithPrioritySpy: jasmine.Spy;
  let modalController: jasmine.SpyObj<ModalController>;
  let alertController: jasmine.SpyObj<AlertController>;
  let actionSheetController: jasmine.SpyObj<ActionSheetController>;
  let popoverController: jasmine.SpyObj<PopoverController>;
  let router: jasmine.SpyObj<Router>;
  let appToast: jasmine.SpyObj<AppToastService>;
  let routerOutlet: jasmine.SpyObj<IonRouterOutlet>;
  let currentUrl: string;

  beforeEach(() => {
    currentUrl = '/tabs/home';
    subscribeWithPrioritySpy = jasmine.createSpy('subscribeWithPriority').and.returnValue({
      unsubscribe: jasmine.createSpy('unsubscribe'),
    });

    modalController = jasmine.createSpyObj<ModalController>('ModalController', ['getTop']);
    modalController.getTop.and.resolveTo(undefined);
    alertController = jasmine.createSpyObj<AlertController>('AlertController', ['getTop', 'create']);
    alertController.getTop.and.resolveTo(undefined);
    alertController.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'cancel' }),
    } as never);
    actionSheetController = jasmine.createSpyObj<ActionSheetController>('ActionSheetController', ['getTop']);
    actionSheetController.getTop.and.resolveTo(undefined);
    popoverController = jasmine.createSpyObj<PopoverController>('PopoverController', ['getTop']);
    popoverController.getTop.and.resolveTo(undefined);
    appToast = jasmine.createSpyObj<AppToastService>('AppToastService', ['info']);
    appToast.info.and.resolveTo();

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl', 'parseUrl']);
    router.navigateByUrl.and.resolveTo(true);
    router.parseUrl.and.callFake((url: string) => new DefaultUrlSerializer().parse(url));
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => currentUrl,
    });

    routerOutlet = jasmine.createSpyObj<IonRouterOutlet>('IonRouterOutlet', ['canGoBack', 'pop']);
    routerOutlet.canGoBack.and.returnValue(false);
    routerOutlet.pop.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        HardwareBackCoordinatorService,
        { provide: Platform, useValue: { backButton: { subscribeWithPriority: subscribeWithPrioritySpy } } },
        { provide: Router, useValue: router },
        { provide: ModalController, useValue: modalController },
        { provide: AlertController, useValue: alertController },
        { provide: ActionSheetController, useValue: actionSheetController },
        { provide: PopoverController, useValue: popoverController },
        { provide: AppToastService, useValue: appToast },
      ],
    });

    service = TestBed.inject(HardwareBackCoordinatorService);
  });

  afterEach(() => {
    try {
      jasmine.clock().uninstall();
    } catch {
      // no-op when the clock was not installed in a test
    }
  });

  it('registers one native Android hardware-back listener', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');

    service.initialize(routerOutlet);
    service.initialize(routerOutlet);

    expect(subscribeWithPrioritySpy).toHaveBeenCalledTimes(1);
    expect(subscribeWithPrioritySpy).toHaveBeenCalledWith(10, jasmine.any(Function));
  });

  it('dismisses overlays before route navigation', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const dismissSpy = jasmine.createSpy('dismiss').and.resolveTo(true);
    alertController.getTop.and.resolveTo({ dismiss: dismissSpy } as never);

    await service.handleHardwareBack();

    expect(dismissSpy).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('steps progressive selector back before dismissing the modal', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const handler = jasmine.createSpy('handleBack').and.resolveTo(true);
    service.registerSelectorHandler({
      isOpen: () => true,
      handleBack: handler,
    });

    await service.handleHardwareBack();

    expect(handler).toHaveBeenCalled();
    expect(modalController.getTop).not.toHaveBeenCalled();
  });

  it('shows discard confirmation for dirty forms and stays when editing continues', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    service.registerUnsavedChangesHandler({
      isDirty: () => true,
    });

    await service.handleHardwareBack();

    expect(alertController.create).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to the fallback route after discard is confirmed', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    currentUrl = '/tabs/prayer/submit';
    alertController.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'destructive' }),
    } as never);
    const onDiscard = jasmine.createSpy('onDiscard').and.resolveTo();
    service.registerUnsavedChangesHandler({
      isDirty: () => true,
      onDiscard,
    });

    await service.handleHardwareBack();

    expect(onDiscard).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/prayer', { replaceUrl: true });
  });

  it('pops the Ionic stack when the active outlet can go back', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    routerOutlet.canGoBack.and.returnValue(true);
    service.initialize(routerOutlet);

    await service.handleHardwareBack();

    expect(routerOutlet.pop).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('uses direct deep-link fallbacks for secondary routes with no stack history', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    currentUrl = '/bible-study/42/read';

    await service.handleHardwareBack();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/bible-study', { replaceUrl: true });
  });

  it('navigates from non-home top-level tabs back to Home', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    currentUrl = '/tabs/profile';

    await service.handleHardwareBack();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('requires a second back press on Home before exiting', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const exitSpy = spyOn(App, 'exitApp');
    jasmine.clock().install();

    await service.handleHardwareBack();
    expect(appToast.info).toHaveBeenCalledWith('Press back again to exit', { duration: 2000 });
    expect(exitSpy).not.toHaveBeenCalled();

    await service.handleHardwareBack();
    expect(exitSpy).toHaveBeenCalled();
  });

  it('requires two presses again after the exit window expires', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    const exitSpy = spyOn(App, 'exitApp');
    jasmine.clock().install();

    await service.handleHardwareBack();
    jasmine.clock().tick(2100);
    await service.handleHardwareBack();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(appToast.info.calls.count()).toBe(2);
  });

  it('routes donation outcome back presses to the Donate tab', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    currentUrl = '/tabs/donate/cancel';

    await service.handleHardwareBack();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/donate', { replaceUrl: true });
  });
});
