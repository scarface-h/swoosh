import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';

export type DeliveryZone = 'DHAKA_INSIDE' | 'OUTSIDE_DHAKA';

const DEFAULTS: Record<DeliveryZone, number> = {
  DHAKA_INSIDE: 100,
  OUTSIDE_DHAKA: 150,
};

const SETTING_KEYS: Record<DeliveryZone, string> = {
  DHAKA_INSIDE: 'delivery.dhaka_inside',
  OUTSIDE_DHAKA: 'delivery.outside_dhaka',
};
export function defaultDeliveryCharge(zone: DeliveryZone): number {
  return DEFAULTS[zone];
}

export function isValidZone(zone: string): zone is DeliveryZone {
  return zone === 'DHAKA_INSIDE' || zone === 'OUTSIDE_DHAKA';
}

/**
 * Authoritative delivery charge. The frontend only sends a normalized zone
 * identifier; the backend resolves the charge from configurable site settings
 * (falling back to the documented defaults).
 */
export async function getDeliveryCharge(zone: string, subtotal?: number): Promise<number> {
  if (!isValidZone(zone)) {
    throw new AppError(400, 'DELIVERY_ZONE_INVALID', `Unknown delivery zone: ${zone}`);
  }

  const setting = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS[zone] } });
  if (setting) {
    const value = setting.value as { charge?: number; active?: boolean; freeAbove?: number } | number;
    if (typeof value === 'object' && value.active === false) {
      throw new AppError(400, 'DELIVERY_ZONE_INVALID', 'This delivery zone is not active');
    }
    if (
      typeof value === 'object' &&
      Number.isFinite(Number(value.freeAbove)) &&
      subtotal !== undefined &&
      subtotal >= Number(value.freeAbove)
    ) return 0;
    const parsed = typeof value === 'number' ? value : Number(value.charge);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return defaultDeliveryCharge(zone);
}
