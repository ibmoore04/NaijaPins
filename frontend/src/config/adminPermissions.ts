import { UserRole } from '@/types/database';

export type AdminModule =
  | 'overview'
  | 'moderation'
  | 'support'
  | 'memories'
  | 'users'
  | 'reports'
  | 'comments'
  | 'categories'
  | 'memberships'
  | 'analytics'
  | 'notifications'
  | 'settings';

export const ADMIN_ROLE_PERMISSIONS: Record<string, AdminModule[]> = {
  super_admin: [
    'overview',
    'moderation',
    'support',
    'memories',
    'users',
    'reports',
    'comments',
    'categories',
    'memberships',
    'analytics',
    'notifications',
    'settings',
  ],
  admin: [
    'overview',
    'moderation',
    'support',
    'memories',
    'users',
    'reports',
    'comments',
    'categories',
    'memberships',
    'analytics',
    'notifications',
    'settings',
  ],
  platform_admin: [
    'overview',
    'moderation',
    'support',
    'memories',
    'users',
    'reports',
    'comments',
    'categories',
    'memberships',
    'analytics',
    'notifications',
    'settings',
  ],
  moderator: [
    'overview',
    'moderation',
    'support',
    'memories',
    'reports',
    'comments',
    'notifications',
  ],
  support_admin: [
    'overview',
    'support',
    'users',
    'reports',
    'notifications',
  ],
};

export const hasAdminAccess = (role?: UserRole | string | null): boolean => {
  if (!role) return false;
  return ['super_admin', 'platform_admin', 'admin', 'moderator', 'support_admin'].includes(role);
};

export const hasModulePermission = (
  role: UserRole | string | undefined | null,
  module: AdminModule
): boolean => {
  if (!role) return false;
  const allowed = ADMIN_ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(module) : false;
};

export const getRoleDisplayName = (role?: UserRole | string | null): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'platform_admin':
      return 'Platform Admin';
    case 'moderator':
      return 'Moderator';
    case 'support_admin':
      return 'Support Admin';
    case 'admin':
      return 'Admin';
    case 'contributor':
      return 'Contributor';
    default:
      return 'User';
  }
};
