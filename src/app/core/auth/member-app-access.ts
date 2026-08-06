import { AuthUser } from '../models/user.model';

export type MemberAppUserLike =
  | Pick<AuthUser, 'id' | 'role' | 'can_use_member_app'>
  | null
  | undefined;

export const normalizeUserRole = (role: string | null | undefined): string | null =>
  typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : null;

export const canUseMemberApp = (user: MemberAppUserLike): boolean => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  if (typeof user.id !== 'number' || !Number.isInteger(user.id) || user.id <= 0) {
    return false;
  }

  return user.can_use_member_app === true;
};

export const hasMemberRole = (user: MemberAppUserLike): boolean =>
  normalizeUserRole(user?.role) === 'member';
