import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asyncHandler } from "../../common/utilities/asyncHandler.js";
import { validate } from "../../common/middleware/validate.js";
import { sendSuccess, paginationMeta } from "../../common/http/response.js";
import {
  requireAuth,
  requirePermission,
} from "../../common/middleware/auth.js";
import { PERMISSIONS } from "../permissions/permissions.js";
import { prisma } from "../../config/prisma.js";
import { updateOrderStatus, cancelOrder } from "../orders/order.service.js";
import { adjustInventory } from "../inventory/inventory.service.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { AppError } from "../../common/errors/AppError.js";
import { hashPassword, verifyPassword } from "../../common/security/crypto.js";
import { env } from "../../config/env.js";
import { cloudinary, isCloudinaryConfigured } from "../../config/cloudinary.js";
import {
  sanitizeContentObject,
  sanitizePlainText,
} from "../../common/security/sanitize.js";

const router = Router();
router.use(requireAuth("admin"));
const audit = (
  req: any,
  res: any,
  action: string,
  entityType: string,
  entityId?: string,
  previousValue?: unknown,
  newValue?: unknown,
) =>
  writeAuditLog({
    adminId: req.auth.sub,
    action,
    entityType,
    entityId,
    previousValue,
    newValue,
    requestId: res.locals.requestId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
const removeStoredImageWhenUnreferenced = async (image: {
  id: string;
  url: string;
  objectKey: string | null;
}) => {
  const references = await prisma.productImage.count({
    where: {
      id: { not: image.id },
      OR: [
        ...(image.objectKey ? [{ objectKey: image.objectKey }] : []),
        { url: image.url },
      ],
    },
  });
  if (references > 0) return false;
  try {
    if (
      isCloudinaryConfigured &&
      image.objectKey &&
      image.url.includes(`res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`)
    ) {
      await cloudinary.uploader.destroy(image.objectKey, {
        resource_type: "image",
        invalidate: true,
      });
      return true;
    }
    if (
      image.objectKey &&
      env.S3_BUCKET &&
      env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY
    ) {
      const client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      });
      await client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: image.objectKey,
        }),
      );
      return true;
    }
  } catch {
    // The database record is already gone. Storage cleanup can be retried
    // independently without turning a successful admin delete into a 500.
  }
  return false;
};
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});
const knownSettingSchemas: Record<string, z.ZodTypeAny> = {
  "store.name": z.string().min(1).max(160),
  currency: z
    .object({ code: z.literal("BDT"), symbol: z.literal("৳") })
    .strict(),
  "delivery.dhaka_inside": z
    .object({
      charge: z.number().nonnegative().max(100_000),
      active: z.boolean(),
      freeAbove: z.number().nonnegative().optional(),
    })
    .strict(),
  "delivery.outside_dhaka": z
    .object({
      charge: z.number().nonnegative().max(100_000),
      active: z.boolean(),
      freeAbove: z.number().nonnegative().optional(),
    })
    .strict(),
  "payment.cod": z.object({ active: z.boolean() }).strict(),
  maintenance: z
    .object({ active: z.boolean(), message: z.string().max(500).optional() })
    .strict(),
};

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.ORDERS_READ),
  asyncHandler(async (_req, res) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [ordersToday, pendingOrders, customers, lowStockVariants, sales] =
      await Promise.all([
        prisma.order.count({ where: { placedAt: { gte: today } } }),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.productVariant.count({
          where: { stock: { lte: 5 }, isActive: true },
        }),
        prisma.order.aggregate({
          _sum: { grandTotal: true },
          where: {
            placedAt: { gte: today },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
        }),
      ]);
    sendSuccess(res, {
      ordersToday,
      pendingOrders,
      customers,
      lowStockVariants,
      salesToday: sales._sum.grandTotal?.toString() ?? "0.00",
    });
  }),
);

const productBody = z
  .object({
    name: z.string().min(2).max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(191),
    categoryId: z.string().min(1),
    skuPrefix: z.string().max(60).optional().nullable(),
    brand: z.string().max(160).optional().nullable(),
    productType: z.string().max(160).optional().nullable(),
    vendor: z.string().max(160).optional().nullable(),
    countryOfOrigin: z.string().max(120).optional().nullable(),
    hsCode: z.string().max(32).optional().nullable(),
    attributes: z
      .record(z.string().max(500))
      .refine(
        (value) =>
          Object.keys(value).length <= 100 &&
          Object.keys(value).every(
            (key) => key.trim().length > 0 && key.length <= 80,
          ),
        {
          message:
            "Use no more than 100 specifications with names up to 80 characters",
        },
      )
      .default({}),
    shortDescription: z.string().max(500).optional().nullable(),
    description: z.string().min(1).max(100_000),
    regularPrice: z.coerce.number().positive(),
    salePrice: z.coerce.number().positive().optional().nullable(),
    saleStartsAt: z.coerce.date().optional().nullable(),
    saleEndsAt: z.coerce.date().optional().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    tags: z.array(z.string().max(50)).max(30).default([]),
    seoTitle: z.string().max(160).optional().nullable(),
    seoDescription: z.string().max(320).optional().nullable(),
    collectionIds: z.array(z.string()).default([]),
  })
  .strict();

export const fullProductBody = z
  .object({
    product: productBody,
    options: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            values: z
              .array(
                z
                  .object({
                    value: z.string().trim().min(1).max(120),
                    metadata: z.record(z.unknown()).optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .max(8),
    variants: z
      .array(
        z
          .object({
            sku: z.string().trim().min(1).max(100),
            barcode: z.string().trim().max(100).optional().nullable(),
            priceOverride: z.coerce.number().positive().optional().nullable(),
            salePriceOverride: z.coerce
              .number()
              .positive()
              .optional()
              .nullable(),
            saleStartsAt: z.coerce.date().optional().nullable(),
            saleEndsAt: z.coerce.date().optional().nullable(),
            initialStock: z.coerce.number().int().min(0).max(10_000_000),
            lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
            weightGrams: z.coerce
              .number()
              .int()
              .positive()
              .optional()
              .nullable(),
            isActive: z.boolean().default(true),
            optionValues: z.record(z.string().trim().min(1).max(120)),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.product.salePrice != null &&
      input.product.salePrice >= input.product.regularPrice
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["product", "salePrice"],
        message: "Sale price must be lower than the regular price",
      });
    }
    if (
      input.product.saleStartsAt &&
      input.product.saleEndsAt &&
      input.product.saleStartsAt >= input.product.saleEndsAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["product", "saleEndsAt"],
        message: "Sale end must be later than sale start",
      });
    }
    const optionNames = new Set<string>();
    const optionValues = new Map<string, Set<string>>();
    input.options.forEach((option, optionIndex) => {
      const normalizedName = option.name.toLowerCase();
      if (optionNames.has(normalizedName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", optionIndex, "name"],
          message: "Option names must be unique",
        });
      }
      optionNames.add(normalizedName);
      const values = new Set<string>();
      option.values.forEach((item, valueIndex) => {
        const normalizedValue = item.value.toLowerCase();
        if (values.has(normalizedValue)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options", optionIndex, "values", valueIndex, "value"],
            message: "Option values must be unique",
          });
        }
        values.add(normalizedValue);
      });
      optionValues.set(normalizedName, values);
    });

    const skus = new Set<string>();
    const combinations = new Set<string>();
    input.variants.forEach((variant, variantIndex) => {
      const normalizedSku = variant.sku.toLowerCase();
      if (skus.has(normalizedSku)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", variantIndex, "sku"],
          message: "Variant SKUs must be unique",
        });
      }
      skus.add(normalizedSku);
      const combination = input.options
        .map(
          (option) =>
            `${option.name.toLowerCase()}=${
              Object.entries(variant.optionValues)
                .find(
                  ([name]) => name.toLowerCase() === option.name.toLowerCase(),
                )?.[1]
                ?.toLowerCase() ?? ""
            }`,
        )
        .join("|");
      if (combinations.has(combination)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", variantIndex, "optionValues"],
          message: "Variant option combinations must be unique",
        });
      }
      combinations.add(combination);
      if (
        variant.salePriceOverride != null &&
        variant.salePriceOverride >=
          (variant.priceOverride ?? input.product.regularPrice)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", variantIndex, "salePriceOverride"],
          message: "Sale price must be lower than the variant price",
        });
      }
      for (const option of input.options) {
        const selected = Object.entries(variant.optionValues).find(
          ([name]) => name.toLowerCase() === option.name.toLowerCase(),
        )?.[1];
        if (
          !selected ||
          !optionValues
            .get(option.name.toLowerCase())
            ?.has(selected.toLowerCase())
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", variantIndex, "optionValues", option.name],
            message: `Select a valid ${option.name} value`,
          });
        }
      }
      if (Object.keys(variant.optionValues).length !== input.options.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", variantIndex, "optionValues"],
          message: "Variant selections must match the product options",
        });
      }
    });
  });

router.get(
  "/products",
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validate({ query: pagination }),
  asyncHandler(async (req, res) => {
    const q = pagination.parse(req.query);
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search } },
            { slug: { contains: q.search } },
          ],
        }
      : {};
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
          collections: true,
        },
      }),
    ]);
    sendSuccess(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  }),
);

router.post(
  "/products",
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate({ body: productBody }),
  asyncHandler(async (req, res) => {
    const { collectionIds, ...data } = req.body;
    const safeData = sanitizeContentObject(data);
    const product = await prisma.product.create({
      data: {
        ...safeData,
        regularPrice: data.regularPrice.toString(),
        salePrice: data.salePrice?.toString(),
        createdByAdminId: req.auth!.sub,
        collections: {
          create: collectionIds.map((collectionId: string) => ({
            collectionId,
          })),
        },
      },
    });
    await audit(
      req,
      res,
      "product.create",
      "Product",
      product.id,
      undefined,
      product,
    );
    sendSuccess(res, product, 201);
  }),
);

router.post(
  "/products/full",
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate({ body: fullProductBody }),
  asyncHandler(async (req, res) => {
    const { product: productInput, options, variants } = req.body;
    const { collectionIds, ...rawProduct } = productInput;
    const safeProduct = sanitizeContentObject(rawProduct);
    safeProduct.attributes = Object.fromEntries(
      Object.entries(productInput.attributes).map(([key, value]) => [
        sanitizePlainText(key).slice(0, 80),
        sanitizePlainText(String(value)),
      ]),
    );
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          ...safeProduct,
          regularPrice: productInput.regularPrice.toString(),
          salePrice: productInput.salePrice?.toString() ?? null,
          createdByAdminId: req.auth!.sub,
          collections: {
            create: collectionIds.map((collectionId: string) => ({
              collectionId,
            })),
          },
        },
      });

      const valueIds = new Map<string, string>();
      for (const [optionIndex, option] of options.entries()) {
        const createdOption = await tx.productOption.create({
          data: {
            productId: createdProduct.id,
            name: option.name,
            sortOrder: optionIndex,
            values: {
              create: option.values.map(
                (
                  item: { value: string; metadata?: Record<string, unknown> },
                  valueIndex: number,
                ) => ({
                  value: item.value,
                  metadata: item.metadata,
                  sortOrder: valueIndex,
                }),
              ),
            },
          },
          include: { values: true },
        });
        for (const value of createdOption.values) {
          valueIds.set(
            `${createdOption.name.toLowerCase()}\u0000${value.value.toLowerCase()}`,
            value.id,
          );
        }
      }

      for (const variant of variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: createdProduct.id,
            sku: variant.sku,
            barcode: variant.barcode || null,
            priceOverride: variant.priceOverride?.toString() ?? null,
            salePriceOverride: variant.salePriceOverride?.toString() ?? null,
            saleStartsAt: variant.saleStartsAt ?? null,
            saleEndsAt: variant.saleEndsAt ?? null,
            stock: variant.initialStock,
            lowStockThreshold: variant.lowStockThreshold,
            weightGrams: variant.weightGrams ?? null,
            isActive: variant.isActive,
            optionValues: {
              create: Object.entries(
                variant.optionValues as Record<string, string>,
              ).map(([name, value]) => ({
                valueId: valueIds.get(
                  `${name.toLowerCase()}\u0000${value.toLowerCase()}`,
                )!,
              })),
            },
          },
        });
        if (variant.initialStock > 0) {
          await tx.inventoryMovement.create({
            data: {
              variantId: createdVariant.id,
              type: "RESTOCK",
              quantity: variant.initialStock,
              previousStock: 0,
              newStock: variant.initialStock,
              reason: "Initial stock entered during product creation",
              adminId: req.auth!.sub,
            },
          });
        }
      }
      return createdProduct;
    });
    await audit(
      req,
      res,
      "product.full_create",
      "Product",
      product.id,
      undefined,
      { optionCount: options.length, variantCount: variants.length },
    );
    sendSuccess(
      res,
      {
        id: product.id,
        slug: product.slug,
        optionCount: options.length,
        variantCount: variants.length,
      },
      201,
    );
  }),
);

router.get(
  "/products/:id",
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
      include: {
        category: true,
        collections: { include: { collection: true } },
        images: { orderBy: { sortOrder: "asc" } },
        options: { include: { values: { orderBy: { sortOrder: "asc" } } } },
        variants: {
          include: {
            optionValues: { include: { value: { include: { option: true } } } },
          },
        },
      },
    });
    if (!product) throw AppError.notFound("Product not found");
    sendSuccess(res, product);
  }),
);

router.patch(
  "/products/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({ body: productBody.partial() }),
  asyncHandler(async (req, res) => {
    const before = await prisma.product.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
    });
    if (!before) throw AppError.notFound("Product not found");
    const { collectionIds, regularPrice, salePrice, ...rest } = req.body;
    const safeRest = sanitizeContentObject(rest);
    const product = await prisma.$transaction(async (tx) => {
      if (collectionIds) {
        await tx.collectionProduct.deleteMany({
          where: { productId: String(Object.values(req.params)[0]) },
        });
        await tx.collectionProduct.createMany({
          data: collectionIds.map((collectionId: string) => ({
            collectionId,
            productId: String(Object.values(req.params)[0]),
          })),
        });
      }
      return tx.product.update({
        where: { id: String(Object.values(req.params)[0]) },
        data: {
          ...safeRest,
          regularPrice: regularPrice?.toString(),
          salePrice: salePrice === null ? null : salePrice?.toString(),
          updatedByAdminId: req.auth!.sub,
        },
      });
    });
    await audit(
      req,
      res,
      "product.update",
      "Product",
      product.id,
      before,
      product,
    );
    sendSuccess(res, product);
  }),
);

router.post(
  "/products/:id/archive",
  requirePermission(PERMISSIONS.PRODUCTS_ARCHIVE),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        updatedByAdminId: req.auth!.sub,
      },
    });
    await audit(req, res, "product.archive", "Product", product.id, undefined, {
      status: "ARCHIVED",
    });
    sendSuccess(res, product);
  }),
);
router.post(
  "/products/:id/permanent-delete",
  requirePermission(PERMISSIONS.PRODUCTS_ARCHIVE),
  validate({
    body: z
      .object({
        password: z.string().min(1).max(500),
        confirmation: z.string().min(1).max(200),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const productId = String(Object.values(req.params)[0]);
    const [admin, product] = await Promise.all([
      prisma.adminUser.findUnique({ where: { id: req.auth!.sub } }),
      prisma.product.findUnique({
        where: { id: productId },
        include: { images: true },
      }),
    ]);
    if (
      !admin ||
      !(await verifyPassword(admin.passwordHash, req.body.password))
    ) {
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Administrator password is incorrect",
      );
    }
    if (!product) throw AppError.notFound("Product not found");
    if (req.body.confirmation !== product.name) {
      throw AppError.validation(
        "Confirmation must exactly match the product name",
        { confirmation: ["Enter the complete product name exactly as shown"] },
      );
    }
    const [inventoryHistory, reviews] = await Promise.all([
      prisma.inventoryMovement.count({
        where: { variant: { productId } },
      }),
      prisma.review.count({ where: { productId } }),
    ]);
    if (inventoryHistory > 0 || reviews > 0) {
      throw AppError.conflict(
        "CONFLICT",
        "This product has inventory or review history and cannot be permanently deleted. Archive it instead to preserve business records.",
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: { variant: { productId } },
      });
      await tx.productVariant.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });
    await Promise.all(
      product.images.map((image) => removeStoredImageWhenUnreferenced(image)),
    );
    await audit(req, res, "product.permanent_delete", "Product", productId, {
      name: product.name,
      slug: product.slug,
      imageCount: product.images.length,
    });
    sendSuccess(res, { deleted: true, id: productId });
  }),
);
router.post(
  "/products/:id/restore",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: {
        status: "DRAFT",
        archivedAt: null,
        updatedByAdminId: req.auth!.sub,
      },
    });
    await audit(req, res, "product.restore", "Product", product.id);
    sendSuccess(res, product);
  }),
);
router.post(
  "/products/:id/publish",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: {
        status: "ACTIVE",
        archivedAt: null,
        updatedByAdminId: req.auth!.sub,
      },
    });
    await audit(req, res, "product.publish", "Product", product.id, undefined, {
      status: "ACTIVE",
    });
    sendSuccess(res, product);
  }),
);
router.post(
  "/products/:id/duplicate",
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  asyncHandler(async (req, res) => {
    const source: any = await prisma.product.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
      include: {
        images: true,
        collections: true,
        options: { include: { values: true } },
        variants: {
          include: {
            optionValues: { include: { value: { include: { option: true } } } },
          },
        },
      },
    });
    if (!source) throw AppError.notFound("Product not found");
    const copyStamp = Date.now();
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          categoryId: source.categoryId,
          name: `${source.name} Copy`,
          slug: `${source.slug}-copy-${copyStamp}`,
          skuPrefix: source.skuPrefix
            ? `${source.skuPrefix}-COPY`.slice(0, 60)
            : null,
          brand: source.brand,
          productType: source.productType,
          vendor: source.vendor,
          countryOfOrigin: source.countryOfOrigin,
          hsCode: source.hsCode,
          attributes: source.attributes,
          shortDescription: source.shortDescription,
          description: source.description,
          regularPrice: source.regularPrice,
          salePrice: source.salePrice,
          saleStartsAt: source.saleStartsAt,
          saleEndsAt: source.saleEndsAt,
          status: "DRAFT",
          isFeatured: false,
          isNewArrival: false,
          tags: source.tags as any,
          seoTitle: source.seoTitle,
          seoDescription: source.seoDescription,
          createdByAdminId: req.auth!.sub,
          images: {
            create: source.images.map((image: any) => ({
              url: image.url,
              objectKey: image.objectKey,
              altText: image.altText,
              mimeType: image.mimeType,
              width: image.width,
              height: image.height,
              sortOrder: image.sortOrder,
              isPrimary: image.isPrimary,
            })),
          },
          options: {
            create: source.options.map((option: any) => ({
              name: option.name,
              sortOrder: option.sortOrder,
              values: {
                create: option.values.map((value: any) => ({
                  value: value.value,
                  metadata: value.metadata,
                  sortOrder: value.sortOrder,
                })),
              },
            })),
          },
          collections: {
            create: source.collections.map((collection: any) => ({
              collectionId: collection.collectionId,
              sortOrder: collection.sortOrder,
            })),
          },
        },
      });
      const [createdOptions, createdImages] = await Promise.all([
        tx.productOption.findMany({
          where: { productId: created.id },
          include: { values: true },
        }),
        tx.productImage.findMany({ where: { productId: created.id } }),
      ]);
      const valueIds = new Map<string, string>();
      for (const option of createdOptions) {
        for (const value of option.values) {
          valueIds.set(
            `${option.name.toLowerCase()}\u0000${value.value.toLowerCase()}`,
            value.id,
          );
        }
      }
      for (const [index, variant] of source.variants.entries()) {
        const sourceImage = source.images.find(
          (image: any) => image.id === variant.imageId,
        );
        const copiedImage = sourceImage
          ? createdImages.find(
              (image) =>
                image.url === sourceImage.url &&
                image.sortOrder === sourceImage.sortOrder,
            )
          : null;
        await tx.productVariant.create({
          data: {
            productId: created.id,
            sku: `${variant.sku}-COPY-${copyStamp}-${index}`.slice(0, 100),
            barcode: null,
            priceOverride: variant.priceOverride,
            salePriceOverride: variant.salePriceOverride,
            saleStartsAt: variant.saleStartsAt,
            saleEndsAt: variant.saleEndsAt,
            stock: 0,
            lowStockThreshold: variant.lowStockThreshold,
            weightGrams: variant.weightGrams,
            imageId: copiedImage?.id ?? null,
            isActive: variant.isActive,
            optionValues: {
              create: variant.optionValues.map((entry: any) => ({
                valueId: valueIds.get(
                  `${entry.value.option.name.toLowerCase()}\u0000${entry.value.value.toLowerCase()}`,
                )!,
              })),
            },
          },
        });
      }
      return created;
    });
    await audit(
      req,
      res,
      "product.duplicate",
      "Product",
      product.id,
      { sourceId: source.id },
      product,
    );
    sendSuccess(res, product, 201);
  }),
);

router.post(
  "/products/:id/options",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        name: z.string().min(1).max(80),
        sortOrder: z.number().int().default(0),
        values: z
          .array(
            z
              .object({
                value: z.string().min(1).max(120),
                metadata: z.unknown().optional(),
                sortOrder: z.number().int().default(0),
              })
              .strict(),
          )
          .min(1)
          .max(100),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const option = await prisma.productOption.create({
      data: {
        productId: String(Object.values(req.params)[0]),
        name: req.body.name,
        sortOrder: req.body.sortOrder,
        values: { create: req.body.values },
      },
      include: { values: true },
    });
    await audit(req, res, "product.option_create", "ProductOption", option.id);
    sendSuccess(res, option, 201);
  }),
);
router.patch(
  "/options/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        name: z.string().trim().min(1).max(80).optional(),
        sortOrder: z.number().int().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const id = String(Object.values(req.params)[0]);
    const before = await prisma.productOption.findUnique({ where: { id } });
    if (!before) throw AppError.notFound("Product option not found");
    const option = await prisma.productOption.update({
      where: { id },
      data: req.body,
    });
    await audit(
      req,
      res,
      "product.option_update",
      "ProductOption",
      id,
      before,
      option,
    );
    sendSuccess(res, option);
  }),
);
router.post(
  "/options/:id/values",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        value: z.string().trim().min(1).max(120),
        metadata: z.record(z.unknown()).optional(),
        sortOrder: z.number().int().default(0),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const optionId = String(Object.values(req.params)[0]);
    const value = await prisma.productOptionValue.create({
      data: { ...req.body, optionId },
    });
    await audit(
      req,
      res,
      "product.option_value_create",
      "ProductOptionValue",
      value.id,
    );
    sendSuccess(res, value, 201);
  }),
);
router.patch(
  "/option-values/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        value: z.string().trim().min(1).max(120).optional(),
        metadata: z.record(z.unknown()).nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const id = String(Object.values(req.params)[0]);
    const before = await prisma.productOptionValue.findUnique({
      where: { id },
    });
    if (!before) throw AppError.notFound("Product option value not found");
    const value = await prisma.productOptionValue.update({
      where: { id },
      data: req.body,
    });
    await audit(
      req,
      res,
      "product.option_value_update",
      "ProductOptionValue",
      id,
      before,
      value,
    );
    sendSuccess(res, value);
  }),
);
router.post(
  "/products/:id/images",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        url: z.string().url(),
        objectKey: z.string().max(500).optional(),
        altText: z.string().max(255).optional(),
        mimeType: z
          .enum(["image/jpeg", "image/png", "image/webp", "image/avif"])
          .optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        sortOrder: z.number().int().default(0),
        isPrimary: z.boolean().default(false),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const productId = String(Object.values(req.params)[0]);
    const image = await prisma.$transaction(async (tx) => {
      if (req.body.isPrimary)
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      return tx.productImage.create({ data: { ...req.body, productId } });
    });
    await audit(req, res, "product.image_create", "ProductImage", image.id);
    sendSuccess(res, image, 201);
  }),
);
router.patch(
  "/images/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        altText: z.string().max(255).nullable().optional(),
        sortOrder: z.number().int().optional(),
        isPrimary: z.boolean().optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const id = String(Object.values(req.params)[0]);
    const before = await prisma.productImage.findUnique({ where: { id } });
    if (!before) throw AppError.notFound("Image not found");
    const image = await prisma.$transaction(async (tx) => {
      if (req.body.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId: before.productId, id: { not: id } },
          data: { isPrimary: false },
        });
      }
      return tx.productImage.update({ where: { id }, data: req.body });
    });
    await audit(
      req,
      res,
      "product.image_update",
      "ProductImage",
      id,
      before,
      image,
    );
    sendSuccess(res, image);
  }),
);
router.delete(
  "/images/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  asyncHandler(async (req, res) => {
    const image = await prisma.productImage.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
    });
    if (!image) throw AppError.notFound("Image not found");
    await prisma.productImage.delete({ where: { id: image.id } });
    const storageDeleted = await removeStoredImageWhenUnreferenced(image);
    await audit(
      req,
      res,
      "product.image_delete",
      "ProductImage",
      image.id,
      undefined,
      { storageDeleted },
    );
    sendSuccess(res, {
      deleted: true,
      objectKey: image.objectKey,
      storageDeleted,
    });
  }),
);

const variantBody = z
  .object({
    sku: z.string().min(1).max(100),
    barcode: z.string().max(100).optional().nullable(),
    priceOverride: z.coerce.number().positive().optional().nullable(),
    salePriceOverride: z.coerce.number().positive().optional().nullable(),
    saleStartsAt: z.coerce.date().optional().nullable(),
    saleEndsAt: z.coerce.date().optional().nullable(),
    lowStockThreshold: z.coerce.number().int().min(0).default(5),
    weightGrams: z.coerce.number().int().positive().optional().nullable(),
    imageId: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    optionValueIds: z.array(z.string()).min(1),
  })
  .strict();
router.post(
  "/products/:id/variants",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({ body: variantBody }),
  asyncHandler(async (req, res) => {
    const { optionValueIds, priceOverride, salePriceOverride, ...data } =
      req.body;
    const variant = await prisma.productVariant.create({
      data: {
        ...data,
        productId: String(Object.values(req.params)[0]),
        stock: 0,
        priceOverride: priceOverride?.toString(),
        salePriceOverride: salePriceOverride?.toString(),
        optionValues: {
          create: optionValueIds.map((valueId: string) => ({ valueId })),
        },
      },
    });
    await audit(req, res, "variant.create", "ProductVariant", variant.id);
    sendSuccess(res, variant, 201);
  }),
);
router.patch(
  "/variants/:id",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({ body: variantBody.partial() }),
  asyncHandler(async (req, res) => {
    const { optionValueIds, priceOverride, salePriceOverride, ...data } =
      req.body;
    const variant = await prisma.$transaction(async (tx) => {
      if (optionValueIds) {
        await tx.variantOptionValue.deleteMany({
          where: { variantId: String(Object.values(req.params)[0]) },
        });
        await tx.variantOptionValue.createMany({
          data: optionValueIds.map((valueId: string) => ({
            valueId,
            variantId: String(Object.values(req.params)[0]),
          })),
        });
      }
      return tx.productVariant.update({
        where: { id: String(Object.values(req.params)[0]) },
        data: {
          ...data,
          priceOverride: priceOverride?.toString(),
          salePriceOverride: salePriceOverride?.toString(),
        },
      });
    });
    await audit(req, res, "variant.update", "ProductVariant", variant.id);
    sendSuccess(res, variant);
  }),
);
router.delete(
  "/variants/:id",
  requirePermission(PERMISSIONS.PRODUCTS_ARCHIVE),
  asyncHandler(async (req, res) => {
    const variant = await prisma.productVariant.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: { isActive: false, archivedAt: new Date() },
    });
    await audit(req, res, "variant.archive", "ProductVariant", variant.id);
    sendSuccess(res, { archived: true });
  }),
);

router.get(
  "/inventory",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (_req, res) => {
    sendSuccess(
      res,
      await prisma.productVariant.findMany({
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { stock: "asc" },
        take: 500,
      }),
    );
  }),
);
router.post(
  "/inventory/adjust",
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  validate({
    body: z
      .object({
        variantId: z.string().min(1),
        quantity: z
          .number()
          .int()
          .refine((v) => v !== 0),
        type: z.enum(["RESTOCK", "DAMAGE", "CORRECTION", "MANUAL_ADJUSTMENT"]),
        reason: z.string().min(3).max(500),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const result = await adjustInventory({
      ...req.body,
      adminId: req.auth!.sub,
    });
    await audit(
      req,
      res,
      "inventory.adjust",
      "ProductVariant",
      req.body.variantId,
      undefined,
      req.body,
    );
    sendSuccess(res, result);
  }),
);
router.get(
  "/inventory/movements",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await prisma.inventoryMovement.findMany({
        where: req.query.variantId
          ? { variantId: String(req.query.variantId) }
          : {},
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    );
  }),
);

router.get(
  "/orders",
  requirePermission(PERMISSIONS.ORDERS_READ),
  validate({ query: pagination.extend({ status: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const q = pagination
      .extend({ status: z.string().optional() })
      .parse(req.query);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.search)
      where.OR = [
        { orderNumber: { contains: q.search } },
        { customerPhone: { contains: q.search } },
        { customerName: { contains: q.search } },
      ];
    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { placedAt: "desc" },
      }),
    ]);
    sendSuccess(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  }),
);
router.get(
  "/orders/:id",
  requirePermission(PERMISSIONS.ORDERS_READ),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
      include: {
        items: true,
        statusHistory: true,
        internalNotes: true,
        payments: { include: { attempts: true } },
      },
    });
    if (!order) throw AppError.notFound("Order not found");
    sendSuccess(res, order);
  }),
);
router.patch(
  "/orders/:id/status",
  requirePermission(PERMISSIONS.ORDERS_UPDATE_STATUS),
  validate({
    body: z
      .object({
        status: z.enum([
          "PENDING",
          "CONFIRMED",
          "PROCESSING",
          "PACKED",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "RETURN_REQUESTED",
          "RETURNED",
          "REFUNDED",
        ]),
        note: z.string().max(500).optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const before = await prisma.order.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
      select: { status: true },
    });
    const updated = await updateOrderStatus(
      String(Object.values(req.params)[0]),
      req.body.status,
      { type: "ADMIN", id: req.auth!.sub },
      req.body.note,
    );
    await audit(
      req,
      res,
      "order.status_change",
      "Order",
      String(Object.values(req.params)[0]),
      before,
      { status: updated.status },
    );
    sendSuccess(res, updated);
  }),
);
router.post(
  "/orders/:id/cancel",
  requirePermission(PERMISSIONS.ORDERS_CANCEL),
  asyncHandler(async (req, res) => {
    const updated = await cancelOrder(
      String(Object.values(req.params)[0]),
      { type: "ADMIN", id: req.auth!.sub },
      req.body?.note,
    );
    await audit(
      req,
      res,
      "order.cancel",
      "Order",
      String(Object.values(req.params)[0]),
    );
    sendSuccess(res, updated);
  }),
);
router.post(
  "/orders/:id/notes",
  requirePermission(PERMISSIONS.ORDERS_READ),
  validate({ body: z.object({ note: z.string().min(1).max(2000) }).strict() }),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await prisma.orderInternalNote.create({
        data: {
          orderId: String(Object.values(req.params)[0]),
          adminId: req.auth!.sub,
          note: req.body.note,
        },
      }),
      201,
    );
  }),
);
router.post(
  "/orders/:id/refund",
  requirePermission(PERMISSIONS.ORDERS_REFUND),
  validate({
    body: z
      .object({
        amount: z.coerce.number().positive(),
        reason: z.string().min(3).max(500),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findFirst({
      where: { orderId: String(Object.values(req.params)[0]) },
      orderBy: { createdAt: "desc" },
    });
    if (
      !payment ||
      req.body.amount > Number(payment.amount) - Number(payment.refundedAmount)
    )
      throw AppError.badRequest("VALIDATION_ERROR", "Invalid refund amount");
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: { increment: req.body.amount },
        status:
          req.body.amount === Number(payment.amount)
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
      },
    });
    await audit(
      req,
      res,
      "order.refund",
      "Order",
      String(Object.values(req.params)[0]),
      undefined,
      { amount: req.body.amount, reason: req.body.reason },
    );
    sendSuccess(res, updated);
  }),
);

const simpleEntity = (
  path: string,
  model: any,
  body: z.ZodTypeAny,
  permission: string,
  orderBy: any = { createdAt: "desc" },
) => {
  router.get(
    `/${path}`,
    requirePermission(permission),
    asyncHandler(async (_req, res) =>
      sendSuccess(res, await model.findMany({ orderBy, take: 500 })),
    ),
  );
  router.post(
    `/${path}`,
    requirePermission(permission),
    validate({ body }),
    asyncHandler(async (req, res) => {
      const item = await model.create({
        data: sanitizeContentObject(req.body),
      });
      await audit(req, res, `${path}.create`, path, item.id, undefined, item);
      sendSuccess(res, item, 201);
    }),
  );
  router.patch(
    `/${path}/:id`,
    requirePermission(permission),
    validate({ body: (body as z.AnyZodObject).partial() }),
    asyncHandler(async (req, res) => {
      const item = await model.update({
        where: { id: String(Object.values(req.params)[0]) },
        data: sanitizeContentObject(req.body),
      });
      await audit(req, res, `${path}.update`, path, item.id, undefined, item);
      sendSuccess(res, item);
    }),
  );
};
simpleEntity(
  "categories",
  prisma.category,
  z
    .object({
      name: z.string().min(1).max(160),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      description: z.string().max(20_000).optional().nullable(),
      imageUrl: z.string().url().optional().nullable(),
      parentId: z.string().optional().nullable(),
      sortOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
      seoTitle: z.string().max(160).optional().nullable(),
      seoDescription: z.string().max(320).optional().nullable(),
    })
    .strict(),
  PERMISSIONS.PRODUCTS_UPDATE,
  { sortOrder: "asc" },
);
simpleEntity(
  "collections",
  prisma.collection,
  z
    .object({
      name: z.string().min(1).max(160),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      description: z.string().max(20_000).optional().nullable(),
      bannerUrl: z.string().url().optional().nullable(),
      isFeatured: z.boolean().default(false),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
      seoTitle: z.string().max(160).optional().nullable(),
      seoDescription: z.string().max(320).optional().nullable(),
    })
    .strict(),
  PERMISSIONS.PRODUCTS_UPDATE,
  { sortOrder: "asc" },
);
simpleEntity(
  "banners",
  prisma.banner,
  z
    .object({
      title: z.string().min(1).max(200),
      subtitle: z.string().max(500).optional().nullable(),
      imageUrl: z.string().url(),
      mobileImageUrl: z.string().url().optional().nullable(),
      linkUrl: z.string().url().optional().nullable(),
      location: z.string().max(80).default("HOME_HERO"),
      sortOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
    })
    .strict(),
  PERMISSIONS.BANNERS_MANAGE,
  { sortOrder: "asc" },
);
simpleEntity(
  "homepage-sections",
  prisma.homepageSection,
  z
    .object({
      type: z.enum([
        "HERO",
        "PROMOTIONAL",
        "FEATURED_CATEGORIES",
        "FEATURED_COLLECTIONS",
        "PRODUCT_RAIL",
        "BRAND_STORY",
        "GALLERY",
      ]),
      title: z.string().max(200).optional().nullable(),
      config: z.unknown(),
      sortOrder: z.number().int().default(0),
      isVisible: z.boolean().default(true),
    })
    .strict(),
  PERMISSIONS.BANNERS_MANAGE,
  { sortOrder: "asc" },
);

router.get(
  "/customers",
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ),
  ),
);
router.get(
  "/customers/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: String(Object.values(req.params)[0]) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        addresses: true,
        orders: true,
        createdAt: true,
      },
    });
    if (!user) throw AppError.notFound("Customer not found");
    sendSuccess(res, user);
  }),
);
router.patch(
  "/customers/:id/status",
  requirePermission(PERMISSIONS.CUSTOMERS_SUSPEND),
  validate({
    body: z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: { status: req.body.status, sessionVersion: { increment: 1 } },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(req, res, "customer.status", "User", user.id, undefined, {
      status: user.status,
    });
    sendSuccess(res, user);
  }),
);

router.get(
  "/coupons",
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    ),
  ),
);
const couponBody = z
  .object({
    code: z
      .string()
      .min(3)
      .max(80)
      .transform((v) => v.trim().toUpperCase()),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    value: z.coerce.number().positive(),
    minimumSpend: z.coerce.number().nonnegative().optional().nullable(),
    maximumDiscount: z.coerce.number().positive().optional().nullable(),
    totalUsageLimit: z.number().int().positive().optional().nullable(),
    perCustomerUsageLimit: z.number().int().positive().optional().nullable(),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    firstOrderOnly: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();
router.post(
  "/coupons",
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validate({ body: couponBody }),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.create({
      data: {
        ...req.body,
        value: req.body.value.toString(),
        minimumSpend: req.body.minimumSpend?.toString(),
        maximumDiscount: req.body.maximumDiscount?.toString(),
        createdByAdminId: req.auth!.sub,
      },
    });
    await audit(req, res, "coupon.create", "Coupon", coupon.id);
    sendSuccess(res, coupon, 201);
  }),
);
router.patch(
  "/coupons/:id",
  requirePermission(PERMISSIONS.COUPONS_MANAGE),
  validate({ body: couponBody.partial() }),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: req.body,
    });
    await audit(req, res, "coupon.update", "Coupon", coupon.id);
    sendSuccess(res, coupon);
  }),
);

router.get(
  "/reviews",
  requirePermission(PERMISSIONS.REVIEWS_MODERATE),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.review.findMany({
        include: {
          product: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
router.patch(
  "/reviews/:id/status",
  requirePermission(PERMISSIONS.REVIEWS_MODERATE),
  validate({
    body: z.object({ status: z.enum(["APPROVED", "REJECTED"]) }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: String(Object.values(req.params)[0]) },
      data: {
        status: req.body.status,
        moderatedAt: new Date(),
        moderatedByAdminId: req.auth!.sub,
      },
    });
    await audit(req, res, "review.moderate", "Review", review.id, undefined, {
      status: review.status,
    });
    sendSuccess(res, review);
  }),
);

router.get(
  "/settings",
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.siteSetting.findMany({ orderBy: { key: "asc" } }),
    ),
  ),
);
router.patch(
  "/settings",
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate({
    body: z
      .object({
        settings: z
          .array(
            z.object({
              key: z.string().min(1).max(191),
              value: z.unknown(),
              isPublic: z.boolean().default(false),
            }),
          )
          .max(100),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    for (const setting of req.body.settings) {
      const schema = knownSettingSchemas[setting.key];
      if (schema) setting.value = schema.parse(setting.value);
      else {
        const encoded = JSON.stringify(setting.value);
        if (encoded === undefined || encoded.length > 50_000)
          throw AppError.badRequest(
            "VALIDATION_ERROR",
            `Invalid setting value for ${setting.key}`,
          );
      }
    }
    await prisma.$transaction(
      req.body.settings.map((setting: any) =>
        prisma.siteSetting.upsert({
          where: { key: setting.key },
          create: { ...setting, updatedByAdminId: req.auth!.sub },
          update: {
            value: setting.value,
            isPublic: setting.isPublic,
            updatedByAdminId: req.auth!.sub,
          },
        }),
      ),
    );
    await audit(
      req,
      res,
      "settings.update",
      "SiteSetting",
      undefined,
      undefined,
      { keys: req.body.settings.map((s: any) => s.key) },
    );
    sendSuccess(res, { updated: req.body.settings.length });
  }),
);

router.get(
  "/users",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.adminUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          lastLoginAt: true,
          roles: { include: { role: true } },
        },
      }),
    ),
  ),
);
router.post(
  "/users",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validate({
    body: z
      .object({
        email: z.string().email(),
        name: z.string().min(2),
        password: z.string().min(12),
        roleIds: z.array(z.string()).min(1),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const admin = await prisma.adminUser.create({
      data: {
        email: req.body.email.toLowerCase(),
        name: req.body.name,
        passwordHash: await hashPassword(req.body.password),
        roles: {
          create: req.body.roleIds.map((roleId: string) => ({ roleId })),
        },
      },
    });
    await audit(req, res, "admin.create", "AdminUser", admin.id);
    sendSuccess(res, { id: admin.id, email: admin.email }, 201);
  }),
);
router.patch(
  "/users/:id",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validate({
    body: z
      .object({
        name: z.string().min(2).optional(),
        status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
        roleIds: z.array(z.string()).optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const targetId = String(Object.values(req.params)[0]);
    if (
      targetId === req.auth!.sub &&
      (req.body.status === "SUSPENDED" || req.body.roleIds)
    ) {
      throw AppError.validation(
        "You cannot suspend your own account or change your own roles",
      );
    }
    const { roleIds, ...data } = req.body;
    const admin = await prisma.$transaction(async (tx) => {
      if (roleIds) {
        await tx.adminRole.deleteMany({
          where: { adminId: targetId },
        });
        await tx.adminRole.createMany({
          data: roleIds.map((roleId: string) => ({
            roleId,
            adminId: targetId,
          })),
        });
      }
      return tx.adminUser.update({
        where: { id: targetId },
        data: { ...data, sessionVersion: { increment: 1 } },
      });
    });
    await audit(req, res, "admin.update", "AdminUser", admin.id);
    sendSuccess(res, admin);
  }),
);
router.get(
  "/roles",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
      }),
    ),
  ),
);
router.post(
  "/roles",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validate({
    body: z
      .object({
        code: z.string().regex(/^[A-Z_]+$/),
        name: z.string().min(2),
        description: z.string().max(500).optional(),
        permissionIds: z.array(z.string()),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        permissions: {
          create: req.body.permissionIds.map((permissionId: string) => ({
            permissionId,
          })),
        },
      },
    });
    await audit(req, res, "role.create", "Role", role.id);
    sendSuccess(res, role, 201);
  }),
);
router.patch(
  "/roles/:id",
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validate({
    body: z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().max(500).optional(),
        permissionIds: z.array(z.string()).optional(),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    const { permissionIds, ...data } = req.body;
    const role = await prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { roleId: String(Object.values(req.params)[0]) },
        });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            permissionId,
            roleId: String(Object.values(req.params)[0]),
          })),
        });
      }
      return tx.role.update({
        where: { id: String(Object.values(req.params)[0]) },
        data,
      });
    });
    await audit(req, res, "permission.change", "Role", role.id);
    sendSuccess(res, role);
  }),
);
router.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(async (_req, res) =>
    sendSuccess(
      res,
      await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ),
  ),
);

router.post(
  "/uploads/presign",
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate({
    body: z
      .object({
        mimeType: z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ]),
        fileSize: z
          .number()
          .int()
          .positive()
          .max(10 * 1024 * 1024),
        purpose: z.enum(["product", "category", "collection", "banner"]),
      })
      .strict(),
  }),
  asyncHandler(async (req, res) => {
    if (isCloudinaryConfigured) {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = `swoosh/${req.body.purpose}`;
      const publicId = randomUUID();
      const signatureParameters = {
        folder,
        overwrite: false,
        public_id: publicId,
        timestamp,
      };
      const signature = cloudinary.utils.api_sign_request(
        signatureParameters,
        env.CLOUDINARY_API_SECRET!,
      );
      sendSuccess(res, {
        provider: "cloudinary",
        uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        objectKey: `${folder}/${publicId}`,
        publicUrl: null,
        expiresIn: 300,
        fields: {
          api_key: env.CLOUDINARY_API_KEY,
          ...signatureParameters,
          signature,
        },
      });
      return;
    }

    if (
      !env.S3_BUCKET ||
      !env.S3_REGION ||
      !env.S3_ACCESS_KEY_ID ||
      !env.S3_SECRET_ACCESS_KEY
    ) {
      throw new AppError(
        503,
        "INTERNAL_ERROR",
        "Object storage is not configured",
      );
    }
    const extension = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      } as const
    )[req.body.mimeType as "image/jpeg"];
    const objectKey = `${req.body.purpose}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: objectKey,
        ContentType: req.body.mimeType,
        ContentLength: req.body.fileSize,
      }),
      { expiresIn: 300 },
    );
    sendSuccess(res, {
      provider: "s3",
      uploadUrl,
      objectKey,
      publicUrl: env.CDN_BASE_URL
        ? `${env.CDN_BASE_URL.replace(/\/$/, "")}/${objectKey}`
        : null,
      expiresIn: 300,
    });
  }),
);

export const adminRouter = router;
