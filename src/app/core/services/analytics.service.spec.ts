import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  function createService(authState: {
    isAuthenticatedSnapshot: boolean;
    currentUserSnapshot: { id: number; role: string; can_use_member_app?: boolean } | null;
  }): AnalyticsService {
    return new AnalyticsService(authState as never);
  }

  it('classifies member-app-capable admin users as authenticated member-app users', () => {
    const service = createService({
      isAuthenticatedSnapshot: true,
      currentUserSnapshot: {
        id: 9,
        role: 'platform_admin',
        can_use_member_app: true,
      },
    });

    expect(service.getUserType()).toBe('member');
  });

  it('classifies users without member-app capability as guests', () => {
    const service = createService({
      isAuthenticatedSnapshot: true,
      currentUserSnapshot: {
        id: 9,
        role: 'platform_admin',
        can_use_member_app: false,
      },
    });

    expect(service.getUserType()).toBe('guest');
  });
});
