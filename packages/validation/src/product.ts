import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  sku: z.string().min(1).max(50),
  description: z.string().min(10).max(10000),
  shortDescription: z.string().max(500).optional(),
  price: z.number().positive().multipleOf(0.01),
  salePrice: z.number().positive().multipleOf(0.01).optional().nullable(),
  saleStartDate: z.string().datetime().optional().nullable(),
  saleEndDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid(),
  collectionId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  seoTitle: z.string().max(100).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const productVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  colorId: z.string().uuid(),
  sizeId: z.string().uuid(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  price: z.number().positive().multipleOf(0.01).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
