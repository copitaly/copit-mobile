import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

import { StackNavigationService } from './stack-navigation.service';

describe('StackNavigationService', () => {
  let service: StackNavigationService;
  let router: jasmine.SpyObj<Router>;
  let navController: jasmine.SpyObj<NavController>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    navController = jasmine.createSpyObj<NavController>('NavController', ['back']);

    TestBed.configureTestingModule({
      providers: [
        StackNavigationService,
        { provide: Router, useValue: router },
        { provide: NavController, useValue: navController },
      ],
    });

    service = TestBed.inject(StackNavigationService);
  });

  it('uses Ionic back navigation for a Home -> List -> Detail -> Reader back sequence', async () => {
    history.pushState({ navigationId: 4 }, '', '/bible-study/14/read');

    await service.backWithFallback('/bible-study/14');

    expect(navController.back).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('falls back to /bible-study for a direct deep link to the detail page', async () => {
    history.replaceState({ navigationId: 1 }, '', '/bible-study/14');

    await service.backWithFallback('/bible-study');

    expect(navController.back).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study', { replaceUrl: true });
  });

  it('falls back to the manual detail page for a direct deep link or refresh on the reader page', async () => {
    history.replaceState({ navigationId: 1 }, '', '/bible-study/14/read');

    await service.backWithFallback('/bible-study/14');

    expect(navController.back).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/bible-study/14', { replaceUrl: true });
  });

  it('falls back to /home for a direct deep link to the Bible Study list page', async () => {
    history.replaceState({ navigationId: 1 }, '', '/bible-study');

    await service.backWithFallback('/home');

    expect(navController.back).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
  });

  it('prevents duplicate back navigations while one is pending', async () => {
    let resolveNavigate: ((value: boolean) => void) | undefined;
    router.navigateByUrl.and.returnValue(
      new Promise((resolve) => {
        resolveNavigate = resolve;
      })
    );
    history.replaceState({ navigationId: 1 }, '', '/bible-study');

    const first = service.backWithFallback('/home');
    const second = service.backWithFallback('/home');
    resolveNavigate?.(true);

    await first;
    await second;

    expect(router.navigateByUrl.calls.count()).toBe(1);
  });
});
