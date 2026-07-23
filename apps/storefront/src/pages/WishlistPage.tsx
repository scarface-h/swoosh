import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Heart, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { apiFetchPage } from "@/lib/api";
import {
  type CatalogProduct,
  productImage,
  variantLabel,
} from "@/lib/catalog";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCartStore } from "@/stores/cartStore";

export default function WishlistPage() {
  const { items: wishlistIds, removeItem } = useWishlistStore();
  const addItem = useCartStore((state) => state.addItem);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!wishlistIds.length) {
      setProducts([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    apiFetchPage<CatalogProduct>(
      `/products?ids=${encodeURIComponent(wishlistIds.slice(0, 60).join(","))}&pageSize=60`,
    )
      .then((result) => {
        if (!active) return;
        setProducts(
          wishlistIds
            .map((id) => result.items.find((product) => product.id === id))
            .filter((product): product is CatalogProduct => Boolean(product)),
        );
      })
      .catch(() => {
        if (active) setError("We could not load your wishlist.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [wishlistIds]);

  if (!wishlistIds.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 pb-20 pt-24 sm:pt-32">
        <Heart size={48} className="text-line" />
        <p className="font-serif text-2xl">Your wishlist is empty</p>
        <Link to="/shop" className="text-sm underline underline-offset-4">
          Discover products
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
      <div className="mb-7 sm:mb-10">
        <h1 className="inline font-serif text-3xl sm:text-4xl">Wishlist</h1>
        <span className="ml-2 text-muted sm:ml-3">
          ({products.length} items)
        </span>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 border border-line bg-surface text-center">
          <AlertCircle className="h-7 w-7 text-accent" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4 md:gap-6">
          <AnimatePresence initial={false}>
            {products.map((product) => {
              const variant = product.variants.find((item) => item.inStock);
              const image = productImage(product);
              const color =
                variant?.options.find(
                  (option) => option.option.toLowerCase() === "color",
                )?.value ?? "";
              const size =
                variant?.options.find(
                  (option) => option.option.toLowerCase() === "size",
                )?.value ?? (variant ? variantLabel(variant) : "");
              return (
                <motion.article
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to={`/product/${product.slug}`} className="block">
                    <div className="aspect-[4/5] overflow-hidden bg-surface">
                      {image ? (
                        <img
                          src={image}
                          alt={product.images[0]?.alt ?? product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full place-items-center px-4 text-center text-sm text-muted">
                          Image coming soon
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="line-clamp-1 text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatCurrency(Number(variant?.price ?? product.priceFrom))}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={!variant}
                      onClick={() => {
                        if (!variant) return;
                        addItem({
                          id: crypto.randomUUID(),
                          variantId: variant.id,
                          productId: product.id,
                          productName: product.name,
                          productSlug: product.slug,
                          imageUrl: variant.imageUrl ?? image,
                          colorName: color,
                          sizeName: size,
                          unitPrice: Number(variant.price),
                          quantity: 1,
                          maxStock: variant.stock,
                        });
                        removeItem(product.id);
                      }}
                      className="min-h-11 flex-1 bg-ink px-2 py-2.5 text-[11px] uppercase tracking-wider text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-muted sm:text-xs sm:tracking-widest"
                    >
                      {variant ? "Add to bag" : "Sold out"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="flex min-h-11 min-w-11 items-center justify-center border border-line transition-colors hover:border-ink"
                      aria-label={`Remove ${product.name} from wishlist`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
