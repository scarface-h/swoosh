export const PERMISSIONS = {
  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_ARCHIVE: 'products.archive',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  ORDERS_READ: 'orders.read',
  ORDERS_UPDATE_STATUS: 'orders.update_status',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_REFUND: 'orders.refund',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_SUSPEND: 'customers.suspend',
  COUPONS_MANAGE: 'coupons.manage',
  REVIEWS_MODERATE: 'reviews.moderate',
  BANNERS_MANAGE: 'banners.manage',
  SETTINGS_MANAGE: 'settings.manage',
  ADMINS_MANAGE: 'admins.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);
export const hasPermission = (grants: readonly string[], required: string) =>
  grants.includes(required);

/** Default role → permission mapping used by the seed and RBAC bootstrapping. */
export const ROLE_PRESETS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.ADMINS_MANAGE),
  ORDER_MANAGER: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_REFUND,
    PERMISSIONS.CUSTOMERS_READ,
  ],
  INVENTORY_MANAGER: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_ARCHIVE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
  ],
  CONTENT_MANAGER: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.BANNERS_MANAGE,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  SUPPORT_AGENT: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.REVIEWS_MODERATE,
  ],
};
