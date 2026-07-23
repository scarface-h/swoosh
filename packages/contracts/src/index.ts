import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_ERROR','AUTHENTICATION_REQUIRED','INVALID_CREDENTIALS','FORBIDDEN','RESOURCE_NOT_FOUND',
  'EMAIL_ALREADY_EXISTS','SKU_ALREADY_EXISTS','PRODUCT_ARCHIVED','VARIANT_NOT_AVAILABLE','INSUFFICIENT_STOCK',
  'PRICE_CHANGED','INVALID_COUPON','COUPON_EXPIRED','DELIVERY_ZONE_INVALID','INVALID_ORDER_TRANSITION',
  'IDEMPOTENCY_CONFLICT','RATE_LIMIT_EXCEEDED','PAYLOAD_TOO_LARGE','ACCOUNT_LOCKED','CONFLICT','INTERNAL_ERROR',
] as const;
export type ErrorCode = typeof ERROR_CODES[number];
export const ORDER_STATUSES = ['PENDING','CONFIRMED','PROCESSING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export const DELIVERY_ZONES = ['DHAKA_INSIDE','OUTSIDE_DHAKA'] as const;
export type DeliveryZone = typeof DELIVERY_ZONES[number];

export interface ApiSuccess<T, M = Record<string, unknown>> {
  success: true;
  data: T;
  meta?: M;
  requestId: string;
}
export interface ApiFailure {
  success: false;
  error: { code: ErrorCode; message: string; fields?: Record<string, string[]> };
  requestId: string;
}
export type ApiResponse<T, M = Record<string, unknown>> = ApiSuccess<T, M> | ApiFailure;
export interface PaginationMeta { page: number; pageSize: number; total: number; totalPages: number }

export const checkoutLineSchema = z.object({
  variantId: z.string().min(1), quantity: z.number().int().min(1).max(50),
  expectedUnitPrice: z.string().regex(/^\d{1,10}\.\d{2}$/).optional(),
}).strict();
export const deliverySchema = z.object({
  division: z.string().min(1), district: z.string().min(1), area: z.string().min(1), addressLine: z.string().min(1),
  postalCode: z.string().optional(), deliveryZone: z.enum(DELIVERY_ZONES), instructions: z.string().max(500).optional(),
}).strict();
export const checkoutPreviewSchema = z.object({
  items: z.array(checkoutLineSchema).min(1), deliveryZone: z.enum(DELIVERY_ZONES), couponCode: z.string().max(80).optional(),
}).strict();
export const createOrderSchema = z.object({
  customer: z.object({ name: z.string().min(1), phone: z.string().min(6), email: z.string().email().optional() }).strict(),
  delivery: deliverySchema, items: z.array(checkoutLineSchema).min(1), couponCode: z.string().max(80).optional(),
  clientGrandTotal: z.number().nonnegative().optional(),
}).strict();
export type CheckoutPreviewRequest = z.infer<typeof checkoutPreviewSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

export interface PricingLine {
  productName: string; variantSku: string; optionsLabel: string; regularPrice: number; unitPrice: number;
  quantity: number; discount: number; lineTotal: string;
}
export interface PricingBreakdown {
  lines: PricingLine[]; subtotal: string; productDiscount: string; couponDiscount: string;
  discountTotal: string; deliveryCharge: string; grandTotal: string;
}
