export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

export type PaymentMethod = "COD" | "SSLCOMMERZ" | "BKASH";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type DeliveryZone = "DHAKA_INSIDE" | "OUTSIDE_DHAKA";

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSku: string;
  variantSku: string;
  colorName: string;
  sizeName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export type OrderStatusHistory = {
  id: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string;
  note?: string;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  division: string;
  district: string;
  area: string;
  address: string;
  deliveryInstructions?: string | null;
  deliveryZone: DeliveryZone;
  deliveryCharge: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  couponId?: string | null;
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  division: string;
  district: string;
  area: string;
  address: string;
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  items: {
    variantId: string;
    quantity: number;
  }[];
  idempotencyKey: string;
};
