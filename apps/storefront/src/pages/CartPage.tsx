import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatCurrency } from "@swoosh/utilities";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotalFn = useCartStore((s) => s.subtotal);
  const itemCountFn = useCartStore((s) => s.itemCount);
  const subtotal = subtotalFn();
  const itemCount = itemCountFn();

  if (!items.length) {
    return (
      <div className="pt-24 sm:pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <ShoppingBag size={48} className="text-line" />
        <p className="font-serif text-2xl">Your bag is empty</p>
        <Link to="/shop" className="text-sm underline underline-offset-4 text-muted">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      <div className="mb-6 sm:mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl inline">Shopping Bag</h1>
        <span className="text-muted ml-2 sm:ml-3 text-sm sm:text-lg">({itemCount} {itemCount === 1 ? "item" : "items"})</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Items */}
        <div className="lg:col-span-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 sm:gap-4 py-5 sm:py-6 border-b border-line overflow-hidden"
              >
                <div className="w-[82px] h-[105px] sm:w-[100px] sm:h-[125px] bg-surface flex-shrink-0 overflow-hidden">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        to={`/product/${item.productSlug}`}
                        className="font-medium hover:underline underline-offset-2 text-ink"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs sm:text-sm text-muted mt-0.5">{item.colorName}</p>
                      <p className="text-xs sm:text-sm text-muted">Size: {item.sizeName}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex h-11 w-11 -mr-2 -mt-2 items-center justify-center text-muted hover:text-ink transition-colors"
                      aria-label="Remove item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-line">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-line p-5 sm:p-8 lg:sticky lg:top-32">
            <p className="text-sm uppercase tracking-widest mb-6">Order Summary</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t border-line mt-4 pt-4 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              className="mt-6 flex min-h-12 w-full items-center justify-center bg-ink text-light py-4 text-center text-sm uppercase tracking-widest hover:bg-dark transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/shop"
              className="mt-4 block text-center text-sm underline underline-offset-4 text-muted"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
