import { routes } from './app-routing.module';
import { DevotionalDetailPage } from './features/devotionals/devotional-detail.page';
import { DevotionalsPage } from './features/devotionals/devotionals.page';

describe('app routes', () => {
  it('registers the public devotionals list route', async () => {
    const route = routes.find((item) => item.path === 'devotionals');

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalsPage);
  });

  it('registers the public devotional detail route after the list route', async () => {
    const listRouteIndex = routes.findIndex((item) => item.path === 'devotionals');
    const detailRouteIndex = routes.findIndex((item) => item.path === 'devotionals/:slug');
    const route = routes[detailRouteIndex];

    expect(detailRouteIndex).toBeGreaterThan(listRouteIndex);
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();

    const loadedComponent = await route?.loadComponent?.();
    expect(loadedComponent).toBe(DevotionalDetailPage);
  });
});
