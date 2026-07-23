import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';
import type { CouponForCalc } from '../pricing/pricing.service.js';

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export async function validateCouponForOrder(
  rawCode: string,
  subtotal: number,
  userId?: string,
  lines?: Array<{ productId: string; categoryId: string; lineTotal: number }>,
  guestKey?: string,
) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizeCouponCode(rawCode) },
    include: { products: true, categories: true },
  });
  if (!coupon || !coupon.isActive || coupon.archivedAt) {
    throw new AppError(400, 'INVALID_COUPON', 'This coupon code is not valid');
  }
  const now = new Date();
  if (coupon.startsAt > now) throw new AppError(400, 'INVALID_COUPON', 'This coupon is not active yet');
  if (coupon.expiresAt < now) throw new AppError(400, 'COUPON_EXPIRED', 'This coupon has expired');
  if (coupon.minimumSpend && subtotal < Number(coupon.minimumSpend)) {
    throw new AppError(400, 'INVALID_COUPON', `Minimum order of BDT ${coupon.minimumSpend} is required`);
  }
  const totalUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
  if (coupon.totalUsageLimit != null && totalUsed >= coupon.totalUsageLimit) {
    throw new AppError(400, 'INVALID_COUPON', 'This coupon has reached its usage limit');
  }
  if (userId) {
    if (coupon.firstOrderOnly && await prisma.order.count({ where: { customerId: userId } }) > 0) {
      throw new AppError(400, 'INVALID_COUPON', 'This coupon is for first orders only');
    }
    if (coupon.perCustomerUsageLimit != null) {
      const used = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (used >= coupon.perCustomerUsageLimit) {
        throw new AppError(400, 'INVALID_COUPON', 'Customer usage limit reached');
      }
    }
  }
  if (!userId && guestKey) {
    if (coupon.firstOrderOnly && await prisma.order.count({ where: { customerPhone: guestKey } }) > 0) {
      throw new AppError(400, 'INVALID_COUPON', 'This coupon is for first orders only');
    }
    if (coupon.perCustomerUsageLimit != null) {
      const used = await prisma.couponUsage.count({ where: { couponId: coupon.id, guestKey } });
      if (used >= coupon.perCustomerUsageLimit) throw new AppError(400, 'INVALID_COUPON', 'Guest usage limit reached');
    }
  }
  const calc: CouponForCalc = {
    type: coupon.type === 'FIXED_AMOUNT' ? 'FIXED' : 'PERCENTAGE',
    value: coupon.value.toString(),
    maxDiscount: coupon.maximumDiscount?.toString() ?? null,
  };
  if (lines && (coupon.products.length || coupon.categories.length)) {
    const productIds = new Set(coupon.products.map((rule) => rule.productId));
    const categoryIds = new Set(coupon.categories.map((rule) => rule.categoryId));
    calc.eligibleSubtotal = lines
      .filter((line) => productIds.has(line.productId) || categoryIds.has(line.categoryId))
      .reduce((sum, line) => sum + line.lineTotal, 0);
    if (calc.eligibleSubtotal <= 0) throw new AppError(400, 'INVALID_COUPON', 'No cart items are eligible for this coupon');
  }
  return { id: coupon.id, code: coupon.code, calc };
}
