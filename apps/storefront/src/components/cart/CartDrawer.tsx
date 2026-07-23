import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatCurrency } from "@swoosh/utilities";
import { useCartStore } from "@/stores/cartStore";

export default function CartDrawer() {
  const { pathname } = useLocation();
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const subtotal = useCartStore((state) => state.subtotal());
  const itemCount = useCartStore((state) => state.itemCount());

  useEffect(() => {
    closeCart();
  }, [closeCart, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCart, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close shopping bag"
            className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-background shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
          >
            <header className="flex min-h-16 items-center justify-between border-b border-line px-5">
              <div>
                <h2 id="cart-drawer-title" className="font-serif text-2xl text-ink">
                  Shopping Bag
                </h2>
                <p className="text-xs text-muted">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="grid h-11 w-11 place-items-center"
                aria-label="Close shopping bag"
              >
                <X size={21} />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <ShoppingBag size={42} className="text-line" />
                <p className="mt-5 font-serif text-2xl text-ink">Your bag is empty</p>
                <p className="mt-2 max-w-xs text-sm text-muted">
                  Explore the shop and add something you love.
                </p>
                <Link
                  to="/shop"
                  onClick={closeCart}
                  className="mt-6 flex min-h-12 items-center justify-center bg-ink px-8 text-sm uppercase tracking-widest text-white"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-4 border-b border-line py-5"
                    >
                      <Link
                        to={`/product/${item.productSlug}`}
                        onClick={closeCart}
                        className="h-28 w-24 shrink-0 overflow-hidden bg-surface"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="grid h-full place-items-center px-2 text-center text-xs text-muted">
                            Image coming soon
                          </span>
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${item.productSlug}`}
                              onClick={closeCart}
                              className="line-clamp-2 text-sm font-medium text-ink"
                            >
                              {item.productName}
                            </Link>
                            {(item.colorName || item.sizeName) && (
                              <p className="mt-1 text-xs text-muted">
                                {[item.colorName, item.sizeName]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="grid h-10 w-10 shrink-0 place-items-center text-muted hover:text-error"
                            aria-label={`Remove ${item.productName}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-3">
                          <div className="flex items-center border border-line">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="grid h-9 w-9 place-items-center disabled:opacity-30"
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease ${item.productName} quantity`}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-7 text-center text-sm">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="grid h-9 w-9 place-items-center disabled:opacity-30"
                              disabled={item.quantity >= item.maxStock}
                              aria-label={`Increase ${item.productName} quantity`}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <p className="text-sm font-medium text-ink">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <footer className="border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Subtotal</span>
                    <span className="text-lg font-semibold text-ink">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Delivery and discounts are calculated at checkout.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link
                      to="/cart"
                      onClick={closeCart}
                      className="flex min-h-12 items-center justify-center border border-ink text-sm font-medium text-ink"
                    >
                      View bag
                    </Link>
                    <Link
                      to="/checkout"
                      onClick={closeCart}
                      className="flex min-h-12 items-center justify-center bg-ink text-sm font-medium text-white"
                    >
                      Checkout
                    </Link>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
