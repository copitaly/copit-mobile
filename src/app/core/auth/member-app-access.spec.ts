import { canUseMemberApp, hasMemberRole, normalizeUserRole } from './member-app-access';

describe('member-app-access helpers', () => {
  it('prefers the backend can_use_member_app flag', () => {
    expect(canUseMemberApp({ id: 7, role: 'branch_admin', can_use_member_app: true })).toBeTrue();
    expect(canUseMemberApp({ id: 7, role: 'member', can_use_member_app: false })).toBeFalse();
  });

  it('fails closed for missing or malformed state', () => {
    expect(canUseMemberApp(null)).toBeFalse();
    expect(canUseMemberApp(undefined)).toBeFalse();
    expect(canUseMemberApp({ id: 0, role: 'member', can_use_member_app: true })).toBeFalse();
    expect(canUseMemberApp({ id: 7, role: 'member' })).toBeFalse();
  });

  it('keeps exact member-role checks separate from member-app capability', () => {
    expect(hasMemberRole({ id: 1, role: 'member', can_use_member_app: true })).toBeTrue();
    expect(hasMemberRole({ id: 2, role: 'branch_admin', can_use_member_app: true })).toBeFalse();
    expect(normalizeUserRole(' Member ')).toBe('member');
  });
});
