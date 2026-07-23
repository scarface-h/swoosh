import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveEffectivePrice } from '../pricing/pricing.service.js';
import { money } from '../../common/utilities/money.js';

export interface ProductListQuery {
  page: number;
  pageSize: number;
  category?: string;
  collection?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  inStock?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  search?: string;
  ids?: string[];
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'discount';
}

/** Serialize a product (with variants) into a frontend-friendly shape. */
function serializeProduct(p: any) {
  const variants = p.variants.map((v: any) => {
    const { regularPrice, effectivePrice, onSale } = resolveEffectivePrice({
      basePrice: p.regularPrice.toString(),
      salePrice: p.salePrice?.toString() ?? null,
      saleStartsAt: p.saleStartsAt,
      saleEndsAt: p.saleEndsAt,
      variantPriceOverride: v.priceOverride?.toString() ?? null,
      variantSalePriceOverride: v.salePriceOverride?.toString() ?? null,
    });
    return {
      id: v.id,
      sku: v.sku,
      options: v.optionValues.map((ov: any) => ({
        option: ov.value.option?.name,
        value: ov.value.value,
        metadata: ov.value.metadata,
      })),
      price: money(effectivePrice),
      regularPrice: money(regularPrice),
      onSale,
      stock: v.stock,
      inStock: v.stock > 0,
      lowStock: v.stock > 0 && v.stock <= v.lowStockThreshold,
      imageUrl: v.image?.url ?? null,
    };
  });

  const inStock = variants.some((v: any) => v.inStock);
  const prices = variants.map((v: any) => Number(v.price));

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
    collections: p.collections?.map((pc: any) => ({ name: pc.collection.name, slug: pc.collection.slug })) ?? [],
    images: p.images?.map((i: any) => ({ url: i.url, alt: i.altText })) ?? [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    priceFrom: prices.length ? money(Math.min(...prices)) : money(p.regularPrice.toString()),
    inStock,
    variants,
  };
}

const variantInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  collections: { include: { collection: true } },
  variants: {
    where: { isActive: true },
    include: { image: true, optionValues: { include: { value: { include: { option: true } } } } },
  },
};

export async function listProducts(q: ProductListQuery) {
  const where: any = { status: 'ACTIVE', archivedAt: null };
  if (q.ids?.length) where.id = { in: q.ids };
  if (q.category) where.category = { slug: q.category };
  if (q.collection) where.collections = { some: { collection: { slug: q.collection } } };
  if (q.featured) where.isFeatured = true;
  if (q.newArrival) where.isNewArrival = true;
  if (q.minPrice != null || q.maxPrice != null) {
    where.regularPrice = {};
    if (q.minPrice != null) where.regularPrice.gte = q.minPrice;
    if (q.maxPrice != null) where.regularPrice.lte = q.maxPrice;
  }
  if (q.search) {
    where.OR = [
      { name: { contains: q.search } },
      { skuPrefix: { contains: q.search } },
      { variants: { some: { sku: { contains: q.search } } } },
    ];
  }
  const variantAnd: any[] = [];
  if (q.inStock) variantAnd.push({ stock: { gt: 0 }, isActive: true });
  if (q.size) variantAnd.push({ optionValues: { some: { value: { value: q.size, option: { name: 'Size' } } } } });
  if (q.color) variantAnd.push({ optionValues: { some: { value: { value: q.color, option: { name: 'Color' } } } } });
  if (variantAnd.length) where.variants = { some: { AND: variantAnd } };

  const orderBy: any =
    q.sort === 'price_asc'
      ? { regularPrice: 'asc' }
      : q.sort === 'price_desc'
        ? { regularPrice: 'desc' }
        : q.sort === 'popular'
          ? { soldCount: 'desc' }
          : { createdAt: 'desc' };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: variantInclude,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return { total, items: products.map(serializeProduct) };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({ where: { slug }, include: variantInclude });
  if (!product || product.status !== 'ACTIVE' || product.archivedAt) {
    throw AppError.notFound('Product not found');
  }
  void prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
  return serializeProduct(product);
}
