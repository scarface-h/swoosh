import { createHash } from 'node:crypto';
import type { Prisma, OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';
import { generateOrderNumber } from './orderNumber.js';
import { generateOpaqueToken, hashToken } from '../../common/security/crypto.js';
import { resolveEffectivePrice, buildPricing, type PricingLineInput } from '../pricing/pricing.service.js';
import { getDeliveryCharge } from '../checkout/delivery.service.js';
import { validateCouponForOrder } from '../coupons/coupon.service.js';
import { money } from '../../common/utilities/money.js';
import { STOCK_DEDUCTED_STATUSES, assertTransition, type OrderStatus } from './orderStatus.js';

export interface OrderLineRequest { variantId: string; quantity: number; expectedUnitPrice?: string }
export interface CreateOrderRequest {
  idempotencyKey: string;
  userId?: string;
  guestKey?: string;
  customer: { name: string; phone: string; email?: string };
  delivery: {
    division: string; district: string; area: string; addressLine: string;
    postalCode?: string; deliveryZone: string; instructions?: string;
  };
  items: OrderLineRequest[];
  couponCode?: string;
  clientGrandTotal?: number;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(',')}}`;
}
const stableHash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');

export async function priceOrder(req: {
  items: OrderLineRequest[];
  deliveryZone: string;
  couponCode?: string;
  userId?: string;
  guestKey?: string;
}) {
  if (!req.items.length) throw AppError.badRequest('VALIDATION_ERROR', 'Cart is empty');
  const merged = new Map<string, number>();
  for (const item of req.items) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  const normalized = [...merged].map(([variantId, quantity]) => ({
    variantId,
    quantity,
    expectedUnitPrice: req.items.find((item) => item.variantId === variantId)?.expectedUnitPrice,
  }));
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: normalized.map((i) => i.variantId) } },
    include: {
      product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
      optionValues: { include: { value: { include: { option: true } } } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const warnings: { code: string; message: string; variantId: string }[] = [];
  const lines: PricingLineInput[] = [];
  const stockPlan: Array<{
    variantId: string; productId: string; categoryId: string; quantity: number; productName: string;
    productSlug: string; productSku: string | null; variantSku: string;
    options: Array<{ option: string; value: string }>; imageUrl: string | null;
    regularPrice: number; effectivePrice: number; couponEligible: boolean;
    hasFreeDelivery: boolean;
  }> = [];
  for (const item of normalized) {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.isActive || variant.archivedAt) {
      throw new AppError(400, 'VARIANT_NOT_AVAILABLE', 'A selected variant is unavailable');
    }
    if (variant.product.status !== 'ACTIVE' || variant.product.archivedAt) {
      throw new AppError(400, 'PRODUCT_ARCHIVED', `${variant.product.name} is unavailable`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw AppError.badRequest('VALIDATION_ERROR', 'Quantity must be between 1 and 50');
    }
    if (variant.stock < item.quantity) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${variant.sku}`);
    }
    const price = resolveEffectivePrice({
      basePrice: variant.product.regularPrice.toString(),
      salePrice: variant.product.salePrice?.toString(),
      saleStartsAt: variant.product.saleStartsAt,
      saleEndsAt: variant.product.saleEndsAt,
      variantPriceOverride: variant.priceOverride?.toString(),
      variantSalePriceOverride: variant.salePriceOverride?.toString(),
    });
    const options = variant.optionValues
      .sort((a, b) => a.value.option.sortOrder - b.value.option.sortOrder)
      .map((entry) => ({ option: entry.value.option.name, value: entry.value.value }));
    const optionsLabel = options.map((o) => o.value).join(' / ');
    lines.push({
      productName: variant.product.name,
      variantSku: variant.sku,
      optionsLabel,
      unitPrice: price.effectivePrice,
      regularPrice: price.regularPrice,
      quantity: item.quantity,
    });
    stockPlan.push({
      variantId: variant.id,
      productId: variant.productId,
      categoryId: variant.product.categoryId,
      quantity: item.quantity,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      productSku: variant.product.skuPrefix,
      variantSku: variant.sku,
      options,
      imageUrl: variant.product.images[0]?.url ?? null,
      regularPrice: price.regularPrice,
      effectivePrice: price.effectivePrice,
      couponEligible: variant.product.couponEligible,
      hasFreeDelivery: variant.product.hasFreeDelivery,
    });
    if (variant.stock - item.quantity <= variant.lowStockThreshold) {
      warnings.push({ code: 'LOW_STOCK', message: `Low stock for ${variant.sku}`, variantId: variant.id });
    }
    if (item.expectedUnitPrice != null && money(item.expectedUnitPrice) !== money(price.effectivePrice)) {
      warnings.push({ code: 'PRICE_CHANGED', message: `Price changed for ${variant.sku}`, variantId: variant.id });
    }
  }
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const deliveryCharge = stockPlan.every((line) => line.hasFreeDelivery)
    ? 0
    : await getDeliveryCharge(req.deliveryZone, subtotal);
  const coupon = req.couponCode
    ? await validateCouponForOrder(req.couponCode, subtotal, req.userId, stockPlan.map((line) => ({
        productId: line.productId,
        categoryId: line.categoryId,
        lineTotal: line.effectivePrice * line.quantity,
        couponEligible: line.couponEligible,
      })), req.guestKey)
    : null;
  return { breakdown: buildPricing({ lines, deliveryCharge, coupon: coupon?.calc }), warnings, stockPlan, coupon };
}

export async function createOrder(req: CreateOrderRequest) {
  const keyHash = hashToken(req.idempotencyKey);
  const requestHash = stableHash(req);
  const existing = await prisma.idempotencyKey.findUnique({
    where: { scope_keyHash: { scope: 'order.create', keyHash } },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was used with different data');
    }
    if (existing.responseBody) return { replayed: true, order: existing.responseBody };
    throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This order request is already processing');
  }
  await prisma.idempotencyKey.create({
    data: {
      scope: 'order.create',
      keyHash,
      requestHash,
      userId: req.userId,
      guestKey: req.guestKey,
      lockedUntil: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  }).catch(() => {
    throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Duplicate checkout submission');
  });
  try {
    const priced = await priceOrder({
      items: req.items,
      deliveryZone: req.delivery.deliveryZone,
      couponCode: req.couponCode,
      userId: req.userId,
      guestKey: req.userId ? undefined : req.guestKey ?? req.customer.phone,
    });
    if (req.clientGrandTotal != null && money(req.clientGrandTotal) !== priced.breakdown.grandTotal) {
      throw new AppError(409, 'PRICE_CHANGED', 'Order total changed; please review the latest total');
    }
    const orderNumber = generateOrderNumber();
    const trackingToken = generateOpaqueToken(24);
    const order = await prisma.$transaction(async (tx) => {
      const stockBefore = new Map<string, number>();
      for (const line of priced.stockPlan) {
        const current = await tx.productVariant.findUnique({ where: { id: line.variantId }, select: { stock: true } });
        if (!current) throw new AppError(409, 'VARIANT_NOT_AVAILABLE', 'Variant is unavailable');
        const changed = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity }, isActive: true },
          data: { stock: { decrement: line.quantity } },
        });
        if (changed.count !== 1) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Stock changed during checkout');
        stockBefore.set(line.variantId, current.stock);
        await tx.product.update({ where: { id: line.productId }, data: { soldCount: { increment: line.quantity } } });
      }
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: req.userId,
          customerName: req.customer.name,
          customerPhone: req.customer.phone,
          customerEmail: req.customer.email,
          addressSnapshot: req.delivery as unknown as Prisma.InputJsonValue,
          deliveryZone: req.delivery.deliveryZone,
          deliveryCharge: priced.breakdown.deliveryCharge,
          subtotal: priced.breakdown.subtotal,
          productDiscount: priced.breakdown.productDiscount,
          couponDiscount: priced.breakdown.couponDiscount,
          grandTotal: priced.breakdown.grandTotal,
          couponId: priced.coupon?.id,
          couponCode: priced.coupon?.code,
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          publicTrackingTokenHash: hashToken(trackingToken),
          items: {
            create: priced.stockPlan.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productNameSnapshot: line.productName,
              productSlugSnapshot: line.productSlug,
              productSkuSnapshot: line.productSku,
              variantSkuSnapshot: line.variantSku,
              variantDetailsSnapshot: line.options as unknown as Prisma.InputJsonValue,
              imageUrlSnapshot: line.imageUrl,
              regularUnitPrice: money(line.regularPrice),
              unitPrice: money(line.effectivePrice),
              unitDiscount: money(line.regularPrice - line.effectivePrice),
              quantity: line.quantity,
              lineTotal: money(line.effectivePrice * line.quantity),
            })),
          },
          statusHistory: { create: { newStatus: 'PENDING', actorType: 'SYSTEM', note: 'Order placed' } },
          payments: {
            create: { method: 'COD', provider: 'CASH_ON_DELIVERY', amount: priced.breakdown.grandTotal, status: 'PENDING' },
          },
        },
        include: { items: true },
      });
      for (const line of priced.stockPlan) {
        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            type: 'SALE',
            quantity: -line.quantity,
            previousStock: stockBefore.get(line.variantId)!,
            newStock: stockBefore.get(line.variantId)! - line.quantity,
            reason: `Order ${orderNumber}`,
            orderId: created.id,
          },
        });
      }
      if (priced.coupon) {
        const liveCoupon = await tx.coupon.findUnique({ where: { id: priced.coupon.id } });
        if (!liveCoupon || !liveCoupon.isActive || liveCoupon.expiresAt < new Date()) {
          throw new AppError(400, 'INVALID_COUPON', 'Coupon is no longer available');
        }
        const totalUsed = await tx.couponUsage.count({ where: { couponId: liveCoupon.id } });
        if (liveCoupon.totalUsageLimit != null && totalUsed >= liveCoupon.totalUsageLimit) {
          throw new AppError(400, 'INVALID_COUPON', 'Coupon usage limit was reached');
        }
        if (liveCoupon.perCustomerUsageLimit != null) {
          const identityFilter = req.userId
            ? { userId: req.userId }
            : { guestKey: req.guestKey ?? req.customer.phone };
          const identityUsed = await tx.couponUsage.count({ where: { couponId: liveCoupon.id, ...identityFilter } });
          if (identityUsed >= liveCoupon.perCustomerUsageLimit) {
            throw new AppError(400, 'INVALID_COUPON', 'Customer coupon usage limit was reached');
          }
        }
        await tx.couponUsage.create({
          data: {
            couponId: priced.coupon.id,
            userId: req.userId,
            guestKey: req.userId ? undefined : req.guestKey ?? req.customer.phone,
            orderId: created.id,
          },
        });
      }
      if (req.userId) await tx.cart.deleteMany({ where: { userId: req.userId } });
      return created;
    }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 20_000 });
    const response = {
      orderNumber: order.orderNumber,
      trackingToken,
      status: order.status,
      grandTotal: order.grandTotal.toString(),
      items: order.items.map((item) => ({
        productName: item.productNameSnapshot,
        variantDetails: item.variantDetailsSnapshot,
        quantity: item.quantity,
        lineTotal: item.lineTotal.toString(),
      })),
    };
    await prisma.idempotencyKey.update({
      where: { scope_keyHash: { scope: 'order.create', keyHash } },
      data: { responseBody: response as unknown as Prisma.InputJsonValue, statusCode: 201, orderId: order.id, lockedUntil: null },
    });
    return { replayed: false, order: response, warnings: priced.warnings };
  } catch (error) {
    await prisma.idempotencyKey.deleteMany({
      where: { scope: 'order.create', keyHash, orderId: null },
    }).catch(() => undefined);
    throw error;
  }
}

export async function cancelOrder(orderId: string, actor: { type: string; id?: string }, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw AppError.notFound('Order not found');
    assertTransition(order.status as OrderStatus, 'CANCELLED');
    if (STOCK_DEDUCTED_STATUSES.includes(order.status as OrderStatus) && !order.stockRestoredAt) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        const current = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
        if (!current) continue;
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        if (item.productId) {
          await tx.product.updateMany({ where: { id: item.productId, soldCount: { gte: item.quantity } }, data: { soldCount: { decrement: item.quantity } } });
        }
        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: 'CANCELLATION',
            quantity: item.quantity,
            previousStock: current.stock,
            newStock: current.stock + item.quantity,
            reason: `Cancellation of ${order.orderNumber}`,
            orderId: order.id,
            adminId: actor.type === 'ADMIN' ? actor.id : undefined,
            restorationKey: `cancel:${order.id}:${item.variantId}`,
          },
        });
      }
    }
    return tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        stockRestoredAt: order.stockRestoredAt ?? new Date(),
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: 'CANCELLED',
            actorType: actor.type,
            actorId: actor.id,
            adminId: actor.type === 'ADMIN' ? actor.id : undefined,
            note: note ?? 'Order cancelled',
          },
        },
      },
    });
  }, { isolationLevel: 'Serializable' });
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor: { type: string; id?: string },
  note?: string,
) {
  if (newStatus === 'CANCELLED') return cancelOrder(orderId, actor, note);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw AppError.notFound('Order not found');
  assertTransition(order.status as OrderStatus, newStatus);
  if (newStatus === 'RETURNED') {
    return prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!current) throw AppError.notFound('Order not found');
      assertTransition(current.status as OrderStatus, 'RETURNED');
      if (!current.stockRestoredAt) {
        for (const item of current.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stock: true } });
          if (!variant) continue;
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: 'RETURN',
              quantity: item.quantity,
              previousStock: variant.stock,
              newStock: variant.stock + item.quantity,
              orderId: current.id,
              adminId: actor.type === 'ADMIN' ? actor.id : undefined,
              reason: `Return of ${current.orderNumber}`,
              restorationKey: `return:${current.id}:${item.variantId}`,
            },
          });
        }
      }
      return tx.order.update({
        where: { id: current.id },
        data: {
          status: 'RETURNED',
          stockRestoredAt: current.stockRestoredAt ?? new Date(),
          statusHistory: {
            create: {
              previousStatus: current.status,
              newStatus: 'RETURNED',
              actorType: actor.type,
              actorId: actor.id,
              adminId: actor.type === 'ADMIN' ? actor.id : undefined,
              note,
            },
          },
        },
      });
    }, { isolationLevel: 'Serializable' });
  }
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus as PrismaOrderStatus,
      statusHistory: {
        create: {
          previousStatus: order.status,
          newStatus: newStatus as PrismaOrderStatus,
          actorType: actor.type,
          actorId: actor.id,
          adminId: actor.type === 'ADMIN' ? actor.id : undefined,
          note,
        },
      },
    },
  });
}
