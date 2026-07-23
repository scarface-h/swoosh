export type CartItem = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  colorName: string;
  sizeName: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};
