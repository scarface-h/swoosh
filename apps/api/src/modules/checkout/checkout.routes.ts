import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utilities/asyncHandler.js';
import { validate } from '../../common/middleware/validate.js';
import { sendSuccess } from '../../common/http/response.js';
import { optionalAuth, requireAuth } from '../../common/middleware/auth.js';
import { checkoutLimiter } from '../../common/middleware/rateLimit.js';
import { AppError } from '../../common/errors/AppError.js';
import { priceOrder, createOrder, cancelOrder } from '../orders/order.service.js';
import { prisma } from '../../config/prisma.js';

const router = Router();

const lineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  expectedUnitPrice: z.string().regex(/^\d{1,10}\.\d{2}$/).optional(),
}).strict();

const deliverySchema = z.object({
  division: z.string().min(1),
  district: z.string().min(1),
  area: z.string().min(1),
  addressLine: z.string().min(1),
  postalCode: z.string().optional(),
  deliveryZone: z.enum(['DHAKA_INSIDE', 'OUTSIDE_DHAKA']),
  instructions: z.string().max(500).optional(),
});

// -------- Checkout preview (authoritative pricing, no persistence) ---------

router.post(
  '/preview',
  optionalAuth,
  validate({
    body: z.object({
      items: z.array(lineSchema).min(1),
      deliveryZone: z.enum(['DHAKA_INSIDE', 'OUTSIDE_DHAKA']),
      couponCode: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await priceOrder({
      items: req.body.items,
      deliveryZone: req.body.deliveryZone,
      couponCode: req.body.couponCode,
      userId: req.auth?.type === 'customer' ? req.auth.sub : undefined,
    });
    sendSuccess(res, {
      pricing: result.breakdown,
      warnings: result.warnings,
      coupon: result.coupon ? { code: result.coupon.code } : null,
    });
  })
);

export const checkoutRouter = router;

// ------------------------------- Orders ------------------------------------

const orderRouter = Router();

orderRouter.post(
  '/',
  checkoutLimiter,
  optionalAuth,
  validate({
    body: z.object({
      customer: z.object({
        name: z.string().min(1),
        phone: z.string().min(6),
        email: z.string().email().optional(),
      }),
      delivery: deliverySchema,
      items: z.array(lineSchema).min(1),
      couponCode: z.string().optional(),
      clientGrandTotal: z.number().nonnegative().optional(),
    }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const idempotencyKey = req.header('idempotency-key');
    if (!idempotencyKey) {
      throw AppError.badRequest('VALIDATION_ERROR', 'Idempotency-Key header is required');
    }
    const result = await createOrder({
      idempotencyKey,
      userId: req.auth?.type === 'customer' ? req.auth.sub : undefined,
      customer: req.body.customer,
      delivery: req.body.delivery,
      items: req.body.items,
      couponCode: req.body.couponCode,
      clientGrandTotal: req.body.clientGrandTotal,
    });
    sendSuccess(res, result.order, result.replayed ? 200 : 201);
  })
);

// Customer order history (authenticated).
orderRouter.get(
  '/',
  requireAuth('customer'),
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { customerId: req.auth!.sub },
      orderBy: { placedAt: 'desc' },
      include: { items: true },
    });
    sendSuccess(res, orders);
  })
);

orderRouter.get(
  '/:orderNumber',
  requireAuth('customer'),
  validate({ params: z.object({ orderNumber: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber: String(Object.values(req.params)[0]) },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order || order.customerId !== req.auth!.sub) throw AppError.notFound('Order not found');
    sendSuccess(res, order);
  })
);

orderRouter.post(
  '/:orderNumber/cancel',
  requireAuth('customer'),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { orderNumber: String(Object.values(req.params)[0]) } });
    if (!order || order.customerId !== req.auth!.sub) throw AppError.notFound('Order not found');
    const updated = await cancelOrder(order.id, { type: 'CUSTOMER', id: req.auth!.sub }, 'Cancelled by customer');
    sendSuccess(res, { status: updated.status });
  })
);

// Public tracking: order number + phone (no predictable IDs exposed).
orderRouter.post(
  '/track',
  validate({
    body: z.object({ orderNumber: z.string().min(1), phone: z.string().min(6) }),
  }),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.body.orderNumber },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } }, items: true },
    });
    if (!order || order.customerPhone !== req.body.phone) {
      throw AppError.notFound('No matching order found');
    }
    sendSuccess(res, {
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt,
      grandTotal: order.grandTotal.toString(),
      timeline: order.statusHistory.map((h) => ({ status: h.newStatus, at: h.createdAt, note: h.note })),
      items: order.items.map((i) => ({
        productName: i.productNameSnapshot,
        variantDetails: i.variantDetailsSnapshot,
        quantity: i.quantity,
      })),
    });
  })
);

orderRouter.post(
  '/:orderNumber/return',
  requireAuth('customer'),
  validate({ body: z.object({ reason: z.string().min(5).max(1000) }).strict() }),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { orderNumber: String(Object.values(req.params)[0]) } });
    if (!order || order.customerId !== req.auth!.sub) throw AppError.notFound('Order not found');
    if (order.status !== 'DELIVERED') {
      throw new AppError(409, 'INVALID_ORDER_TRANSITION', 'Only delivered orders may request a return');
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'RETURN_REQUESTED',
        statusHistory: {
          create: {
            previousStatus: 'DELIVERED',
            newStatus: 'RETURN_REQUESTED',
            actorType: 'CUSTOMER',
            actorId: req.auth!.sub,
            note: req.body.reason,
          },
        },
      },
    });
    sendSuccess(res, { status: updated.status });
  })
);

export const orderRouter2 = orderRouter;
