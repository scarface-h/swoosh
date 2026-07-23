export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type ProductColor = {
  id: string;
  name: string;
  hexValue: string;
};

export type ProductSize = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  colorId: string;
  sizeId: string;
  color?: ProductColor;
  size?: ProductSize;
  stock: number;
  lowStockThreshold: number;
  price?: number; // override product price
  isActive: boolean;
};

export type ProductImage = {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number | null;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  categoryId: string;
  collectionId?: string | null;
  tags: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductListItem = Pick<Product, "id" | "name" | "slug" | "price" | "salePrice" | "status" | "isFeatured" | "isNewArrival"> & {
  primaryImage?: string;
  categoryName: string;
  totalStock: number;
};

export type ProductFilters = {
  categories: string[];
  collections: string[];
  sizes: string[];
  colors: string[];
  priceMin?: number;
  priceMax?: number;
  inStockOnly: boolean;
  search?: string;
};

export type ProductSortOption = "newest" | "price-asc" | "price-desc" | "popularity" | "discount" | "name-asc" | "name-desc";
