export interface CatalogOption {
  option: string;
  value: string;
  metadata: { hex?: string } | null;
}

export interface CatalogVariant {
  id: string;
  sku: string;
  options: CatalogOption[];
  price: string;
  regularPrice: string;
  onSale: boolean;
  stock: number;
  inStock: boolean;
  lowStock: boolean;
  imageUrl: string | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  brand: string | null;
  productType: string | null;
  vendor: string | null;
  countryOfOrigin: string | null;
  hsCode: string | null;
  attributes: Record<string, string>;
  category: { name: string; slug: string } | null;
  collections: Array<{ name: string; slug: string }>;
  images: Array<{ url: string; alt: string | null }>;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  priceFrom: string;
  inStock: boolean;
  variants: CatalogVariant[];
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  children?: PublicCategory[];
  _count?: { products: number };
}

export interface PublicCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured?: boolean;
  _count?: { products: number };
}

export const productImage = (product: CatalogProduct) =>
  product.images[0]?.url ??
  product.variants.find((variant) => variant.imageUrl)?.imageUrl ??
  "";

export function optionValues(product: CatalogProduct, optionName: string) {
  const values = new Map<string, CatalogOption>();
  product.variants.forEach((variant) => {
    variant.options.forEach((option) => {
      if (option.option.toLowerCase() === optionName.toLowerCase()) {
        values.set(option.value, option);
      }
    });
  });
  return [...values.values()];
}

export function variantLabel(variant: CatalogVariant) {
  return (
    variant.options.map((option) => option.value).join(" / ") || variant.sku
  );
}

export function findVariant(
  product: CatalogProduct,
  selections: Record<string, string>,
) {
  return product.variants.find(
    (variant) =>
      variant.inStock &&
      Object.entries(selections).every(([name, value]) =>
        variant.options.some(
          (option) => option.option === name && option.value === value,
        ),
      ),
  );
}
