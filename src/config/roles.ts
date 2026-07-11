import type { UserRole, Permission, Permissions } from '../types';

export const MODULES = [
  'dashboard',
  'customers',
  'vehicles',
  'jobCards',
  'inventory',
  'suppliers',
  'purchases',
  'invoices',
  'payments',
  'deliveries',
  'calls',
  'followUps',
  'notifications',
  'activityLogs',
  'stockAdjustments',
  'users',
  'settings',
  'reports',
] as const;

const full: Permission = { create: true, read: true, update: true, delete: true };
const readOnly: Permission = { create: false, read: true, update: false, delete: false };
const none: Permission = { create: false, read: false, update: false, delete: false };

const adminPermissions: Permissions = Object.fromEntries(
  MODULES.map((m) => [m, { ...full }])
) as Permissions;

const managerPermissions: Permissions = {
  dashboard: full,
  customers: full,
  vehicles: full,
  jobCards: full,
  inventory: full,
  suppliers: full,
  purchases: full,
  invoices: full,
  payments: full,
  deliveries: full,
  calls: full,
  followUps: full,
  notifications: full,
  activityLogs: full,
  stockAdjustments: full,
  users: readOnly,
  settings: readOnly,
  reports: full,
};

const serviceAdvisorPermissions: Permissions = {
  dashboard: readOnly,
  customers: full,
  vehicles: full,
  jobCards: full,
  inventory: readOnly,
  suppliers: none,
  purchases: none,
  invoices: readOnly,
  payments: none,
  deliveries: { create: false, read: true, update: true, delete: false },
  calls: full,
  followUps: full,
  notifications: readOnly,
  activityLogs: readOnly,
  stockAdjustments: none,
  users: none,
  settings: none,
  reports: readOnly,
};

const accountsPermissions: Permissions = {
  dashboard: readOnly,
  customers: readOnly,
  vehicles: readOnly,
  jobCards: readOnly,
  inventory: readOnly,
  suppliers: readOnly,
  purchases: readOnly,
  invoices: full,
  payments: full,
  deliveries: readOnly,
  calls: none,
  followUps: none,
  notifications: readOnly,
  activityLogs: readOnly,
  stockAdjustments: none,
  users: none,
  settings: none,
  reports: full,
};

const storeKeeperPermissions: Permissions = {
  dashboard: readOnly,
  customers: none,
  vehicles: none,
  jobCards: readOnly,
  inventory: full,
  suppliers: full,
  purchases: full,
  invoices: none,
  payments: none,
  deliveries: none,
  calls: none,
  followUps: none,
  notifications: readOnly,
  activityLogs: readOnly,
  stockAdjustments: full,
  users: none,
  settings: none,
  reports: readOnly,
};

const technicianPermissions: Permissions = {
  dashboard: readOnly,
  customers: readOnly,
  vehicles: readOnly,
  jobCards: { create: false, read: true, update: true, delete: false },
  inventory: readOnly,
  suppliers: none,
  purchases: none,
  invoices: none,
  payments: none,
  deliveries: none,
  calls: none,
  followUps: none,
  notifications: readOnly,
  activityLogs: readOnly,
  stockAdjustments: none,
  users: none,
  settings: none,
  reports: none,
};

export const PERMISSIONS: Record<UserRole, Permissions> = {
  Admin: adminPermissions,
  Manager: managerPermissions,
  ServiceAdvisor: serviceAdvisorPermissions,
  Accounts: accountsPermissions,
  StoreKeeper: storeKeeperPermissions,
  Technician: technicianPermissions,
};

export function getRolePermissions(role: UserRole): Permissions {
  return PERMISSIONS[role];
}

export function hasPermission(
  role: UserRole,
  module: keyof Permissions,
  action: keyof Permission
): boolean {
  return PERMISSIONS[role]?.[module]?.[action] ?? false;
}
