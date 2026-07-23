export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type PaymentMethod = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'CARD';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type InventoryMovementType = 'RESTOCK' | 'SALE' | 'CANCELLATION' | 'RETURN' | 'DAMAGE' | 'CORRECTION' | 'MANUAL_ADJUSTMENT';
export interface VariantMatrixItem {
  id: string; sku: string; options: Array<{ option: string; value: string; metadata?: unknown }>;
  price: string; regularPrice: string; onSale: boolean; stock: number; inStock: boolean; lowStock: boolean; imageUrl: string | null;
}
