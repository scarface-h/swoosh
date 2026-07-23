import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../common/utilities/asyncHandler.js";
import { optionalAuth, requireAuth } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { sendSuccess } from "../../common/http/response.js";
import { AppError } from "../../common/errors/AppError.js";
import {
  generateOpaqueToken,
  hashToken,
} from "../../common/security/crypto.js";
import { priceOrder } from "../orders/order.service.js";
import { sanitizePlainText } from "../../common/security/sanitize.js";
import { publicFormLimiter } from "../../common/middleware/rateLimit.js";
import { enqueueNotification } from "../notifications/notification.service.js";
import { env } from "../../config/env.js";

export const publicRouter = Router();

publicRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const items = await prisma.category.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
        children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    sendSuccess(res, items);
  }),
);
publicRouter.get(
  "/categories/:slug",
  asyncHandler(async (req, res) => {
    const item = await prisma.category.findUnique({
      where: { slug: String(Object.values(req.params)[0]) },
      include: { children: true, _count: { select: { products: true } } },
    });
    if (!item || !item.isActive) throw AppError.notFound("Category not found");
    sendSuccess(res, item);
  }),
);
publicRouter.get(
  "/collections",
  asyncHandler(async (_req, res) => {
    sendSuccess(
      res,
      await prisma.collection.findMany({
        where: { isActive: true, archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      }),
    );
  }),
);
publicRouter.get(
  "/collections/:slug",
  asyncHandler(async (req, res) => {
    const item = await prisma.collection.findUnique({
      where: { slug: String(Object.values(req.params)[0]) },
      include: { _count: { select: { products: true } } },
    });
    if (!item || !item.isActive)
      throw AppError.notFound("Collection not found");
    sendSuccess(res, item);
  }),
);
publicRouter.get(
  "/search",
  validate({
    query: z.object({
      q: z.string().trim().min(2).max(100),
      limit: z.coerce.number().int().min(1).max(30).default(10),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { q, limit } = z
      .object({ q: z.string(), limit: z.coerce.number() })
      .parse(req.query);
    const items = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        archivedAt: null,
        OR: [{ name: { contains: q } }, { skuPrefix: { contains: q } }],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        regularPrice: true,
        salePrice: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });
    sendSuccess(res, items);
  }),
);
publicRouter.get(
  "/homepage",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const [banners, sections] = await Promise.all([
      prisma.banner.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.homepageSection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    sendSuccess(res, { banners, sections });
  }),
);
publicRouter.get(
  "/settings/public",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSetting.findMany({
      where: { isPublic: true },
      select: { key: true, value: true },
    });
    sendSuccess(res, Object.fromEntries(settings.map((s) => [s.key, s.value])));
  }),
);

publicRouter.post(
  "/newsletter",
  publicFormLimiter,
  validate({
    body: z.object({ email: z.string().trim().email().max(191) }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { isActive: true },
    });
    sendSuccess(res, { subscribed: true }, 201);
  }),
);

publicRouter.post(
  "/contact",
  publicFormLimiter,
  validate({
    body: z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(191),
        subject: z.string().trim().max(200).optional(),
        message: z.string().trim().min(5).max(5000),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const submission = await prisma.contactSubmission.create({
      data: {
        name: sanitizePlainText(req.body.name),
        email: req.body.email.toLowerCase(),
        subject: req.body.subject ? sanitizePlainText(req.body.subject) : null,
        message: sanitizePlainText(req.body.message),
      },
    });
    if (env.CONTACT_EMAIL) {
      await enqueueNotification({
        channel: "EMAIL",
        template: "contact_submission",
        recipient: env.CONTACT_EMAIL,
        subject: `Contact form: ${submission.subject ?? "New message"}`,
        payload: {
          name: submission.name,
          email: submission.email,
          message: submission.message,
        },
      });
    }
    sendSuccess(res, { received: true }, 201);
  }),
);

publicRouter.get(
  "/me",
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerifiedAt: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) throw AppError.notFound("User not found");
    sendSuccess(res, user);
  }),
);
publicRouter.patch(
  "/me",
  requireAuth("customer"),
  validate({
    body: z
      .object({
        name: z.string().min(2).max(120).optional(),
        phone: z.string().min(6).max(20).optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await prisma.user.update({
        where: { id: req.auth!.sub },
        data: req.body,
        select: { id: true, email: true, name: true, phone: true },
      }),
    );
  }),
);
const addressBody = z
  .object({
    label: z.string().max(50).default("Home"),
    name: z.string().min(2).max(120),
    phone: z.string().min(6).max(20),
    division: z.string().min(2).max(80),
    district: z.string().min(2).max(80),
    area: z.string().min(2).max(120),
    addressLine: z.string().min(5).max(500),
    postalCode: z.string().max(20).optional(),
    isDefault: z.boolean().default(false),
  })
  .strict();
publicRouter.get(
  "/addresses",
  requireAuth("customer"),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await prisma.customerAddress.findMany({
        where: { userId: req.auth!.sub },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
    ),
  ),
);
publicRouter.post(
  "/addresses",
  requireAuth("customer"),
  validate({ body: addressBody }),
  asyncHandler(async (req, res) => {
    const address = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault)
        await tx.customerAddress.updateMany({
          where: { userId: req.auth!.sub },
          data: { isDefault: false },
        });
      return tx.customerAddress.create({
        data: { ...req.body, userId: req.auth!.sub },
      });
    });
    sendSuccess(res, address, 201);
  }),
);
publicRouter.patch(
  "/addresses/:id",
  requireAuth("customer"),
  validate({ body: addressBody.partial() }),
  asyncHandler(async (req, res) => {
    const owned = await prisma.customerAddress.findFirst({
      where: {
        id: String(Object.values(req.params)[0]),
        userId: req.auth!.sub,
      },
    });
    if (!owned) throw AppError.notFound("Address not found");
    const address = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault)
        await tx.customerAddress.updateMany({
          where: { userId: req.auth!.sub },
          data: { isDefault: false },
        });
      return tx.customerAddress.update({
        where: { id: owned.id },
        data: req.body,
      });
    });
    sendSuccess(res, address);
  }),
);
publicRouter.delete(
  "/addresses/:id",
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    const deleted = await prisma.customerAddress.deleteMany({
      where: {
        id: String(Object.values(req.params)[0]),
        userId: req.auth!.sub,
      },
    });
    if (!deleted.count) throw AppError.notFound("Address not found");
    sendSuccess(res, { deleted: true });
  }),
);

async function resolveCart(req: any, res: any, create: boolean) {
  if (req.auth?.type === "customer") {
    let cart = await prisma.cart.findFirst({
      where: { userId: req.auth.sub },
      orderBy: { updatedAt: "desc" },
    });
    if (!cart && create)
      cart = await prisma.cart.create({
        data: {
          userId: req.auth.sub,
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      });
    return cart;
  }
  const raw = req.header("x-guest-cart-token");
  if (raw) {
    const cart = await prisma.cart.findUnique({
      where: { guestTokenHash: hashToken(raw) },
    });
    if (cart) return cart;
  }
  if (!create) return null;
  const token = generateOpaqueToken(32);
  const cart = await prisma.cart.create({
    data: {
      guestTokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    },
  });
  res.setHeader("X-Guest-Cart-Token", token);
  return cart;
}
async function cartView(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
              optionValues: {
                include: { value: { include: { option: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) throw AppError.notFound("Cart not found");
  const active = cart.items.filter((i) => !i.savedForLater);
  let pricing = null;
  let warnings: unknown[] = [];
  if (active.length) {
    const result = await priceOrder({
      items: active.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      deliveryZone: "DHAKA_INSIDE",
      couponCode: cart.couponCode ?? undefined,
      userId: cart.userId ?? undefined,
    });
    pricing = result.breakdown;
    warnings = result.warnings;
  }
  return {
    id: cart.id,
    items: cart.items,
    couponCode: cart.couponCode,
    pricing,
    warnings,
    expiresAt: cart.expiresAt,
  };
}
publicRouter.get(
  "/cart",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, true);
    sendSuccess(res, await cartView(cart!.id));
  }),
);
publicRouter.post(
  "/cart/items",
  optionalAuth,
  validate({
    body: z
      .object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, true);
    const variant = await prisma.productVariant.findFirst({
      where: { id: req.body.variantId, isActive: true, archivedAt: null },
    });
    if (!variant)
      throw new AppError(
        400,
        "VARIANT_NOT_AVAILABLE",
        "Variant is unavailable",
      );
    const current = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart!.id, variantId: variant.id } },
    });
    if ((current?.quantity ?? 0) + req.body.quantity > variant.stock)
      throw new AppError(
        409,
        "INSUFFICIENT_STOCK",
        "Requested quantity exceeds stock",
      );
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart!.id, variantId: variant.id } },
      create: {
        cartId: cart!.id,
        variantId: variant.id,
        quantity: req.body.quantity,
      },
      update: {
        quantity: { increment: req.body.quantity },
        savedForLater: false,
      },
    });
    sendSuccess(res, await cartView(cart!.id), 201);
  }),
);
publicRouter.patch(
  "/cart/items/:itemId",
  optionalAuth,
  validate({
    body: z
      .object({
        quantity: z.number().int().min(1).max(50),
        savedForLater: z.boolean().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, false);
    if (!cart) throw AppError.notFound("Cart not found");
    const item = await prisma.cartItem.findFirst({
      where: { id: String(Object.values(req.params)[0]), cartId: cart.id },
      include: { variant: true },
    });
    if (!item) throw AppError.notFound("Cart item not found");
    if (req.body.quantity > item.variant.stock)
      throw new AppError(
        409,
        "INSUFFICIENT_STOCK",
        "Requested quantity exceeds stock",
      );
    await prisma.cartItem.update({ where: { id: item.id }, data: req.body });
    sendSuccess(res, await cartView(cart.id));
  }),
);
publicRouter.delete(
  "/cart/items/:itemId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, false);
    if (!cart) throw AppError.notFound("Cart not found");
    const deleted = await prisma.cartItem.deleteMany({
      where: { id: String(Object.values(req.params)[0]), cartId: cart.id },
    });
    if (!deleted.count) throw AppError.notFound("Cart item not found");
    sendSuccess(res, await cartView(cart.id));
  }),
);
publicRouter.post(
  "/cart/coupon",
  optionalAuth,
  validate({ body: z.object({ code: z.string().min(3).max(80) }).strict() }),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, true);
    await prisma.cart.update({
      where: { id: cart!.id },
      data: { couponCode: req.body.code.trim().toUpperCase() },
    });
    sendSuccess(res, await cartView(cart!.id));
  }),
);
publicRouter.delete(
  "/cart/coupon",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res, false);
    if (!cart) throw AppError.notFound("Cart not found");
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: null },
    });
    sendSuccess(res, await cartView(cart.id));
  }),
);
publicRouter.post(
  "/cart/merge",
  requireAuth("customer"),
  validate({ body: z.object({ guestToken: z.string().min(32) }).strict() }),
  asyncHandler(async (req, res) => {
    const guest = await prisma.cart.findUnique({
      where: { guestTokenHash: hashToken(req.body.guestToken) },
      include: { items: true },
    });
    const customer = await resolveCart(req, res, true);
    if (guest && guest.id !== customer!.id) {
      await prisma.$transaction(async (tx) => {
        for (const item of guest.items)
          await tx.cartItem.upsert({
            where: {
              cartId_variantId: {
                cartId: customer!.id,
                variantId: item.variantId,
              },
            },
            create: {
              cartId: customer!.id,
              variantId: item.variantId,
              quantity: item.quantity,
            },
            update: { quantity: { increment: item.quantity } },
          });
        await tx.cart.delete({ where: { id: guest.id } });
      });
    }
    sendSuccess(res, await cartView(customer!.id));
  }),
);

publicRouter.get(
  "/wishlist",
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.auth!.sub },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                variants: { where: { isActive: true } },
              },
            },
            variant: true,
          },
        },
      },
    });
    sendSuccess(res, wishlist ?? { items: [] });
  }),
);
publicRouter.post(
  "/wishlist/items",
  requireAuth("customer"),
  validate({
    body: z
      .object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const list = await prisma.wishlist.upsert({
      where: { userId: req.auth!.sub },
      create: { userId: req.auth!.sub },
      update: {},
    });
    const item = await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: list.id,
          productId: req.body.productId,
        },
      },
      create: { wishlistId: list.id, ...req.body },
      update: { variantId: req.body.variantId },
    });
    sendSuccess(res, item, 201);
  }),
);
publicRouter.delete(
  "/wishlist/items/:variantId",
  requireAuth("customer"),
  asyncHandler(async (req, res) => {
    const list = await prisma.wishlist.findUnique({
      where: { userId: req.auth!.sub },
    });
    if (!list) throw AppError.notFound("Wishlist not found");
    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: list.id,
        OR: [
          { variantId: String(Object.values(req.params)[0]) },
          { productId: String(Object.values(req.params)[0]) },
        ],
      },
    });
    sendSuccess(res, { deleted: true });
  }),
);

publicRouter.get(
  "/products/:productId/reviews",
  asyncHandler(async (req, res) => {
    const [reviews, summary] = await Promise.all([
      prisma.review.findMany({
        where: {
          productId: String(Object.values(req.params)[0]),
          status: "APPROVED",
        },
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          isVerifiedPurchase: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.aggregate({
        where: {
          productId: String(Object.values(req.params)[0]),
          status: "APPROVED",
        },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    sendSuccess(res, {
      reviews,
      summary: { average: summary._avg?.rating ?? 0, count: summary._count },
    });
  }),
);
publicRouter.post(
  "/products/:productId/reviews",
  requireAuth("customer"),
  validate({
    body: z
      .object({
        orderItemId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(160).optional(),
        body: z.string().min(3).max(5000),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const item = await prisma.orderItem.findFirst({
      where: {
        id: req.body.orderItemId,
        productId: String(Object.values(req.params)[0]),
        order: { customerId: req.auth!.sub, status: "DELIVERED" },
      },
    });
    if (!item)
      throw AppError.forbidden(
        "A delivered purchase is required to review this product",
      );
    const review = await prisma.review.create({
      data: {
        productId: String(Object.values(req.params)[0]),
        userId: req.auth!.sub,
        orderId: item.orderId,
        orderItemId: item.id,
        rating: req.body.rating,
        title: req.body.title ? sanitizePlainText(req.body.title) : undefined,
        body: sanitizePlainText(req.body.body),
      },
    });
    sendSuccess(res, review, 201);
  }),
);
