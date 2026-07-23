import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Truck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { apiFetch, apiFetchPage, ApiError } from "@/lib/api";
import {
  type CatalogProduct,
  findVariant,
  productImage,
  variantLabel,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [related, setRelated] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [accordion, setAccordion] = useState<"details" | "shipping" | null>(
    "details",
  );
  const [stickyVisible, setStickyVisible] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const addItem = useCartStore((state) => state.addItem);
  const wishlist = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setError("");
    setProduct(null);

    if (!slug) {
      setError("Product not found.");
      setLoading(false);
      return;
    }

    apiFetch<CatalogProduct>(`/products/${encodeURIComponent(slug)}`)
      .then((item) => {
        setProduct(item);
        const firstAvailable =
          item.variants.find((variant) => variant.inStock) ?? item.variants[0];
        setSelections(
          Object.fromEntries(
            (firstAvailable?.options ?? []).map((option) => [
              option.option,
              option.value,
            ]),
          ),
        );
        if (item.category) {
          void apiFetchPage<CatalogProduct>(
            `/products?page=1&pageSize=5&category=${encodeURIComponent(item.category.slug)}`,
          )
            .then((result) =>
              setRelated(
                result.items
                  .filter((candidate) => candidate.id !== item.id)
                  .slice(0, 4),
              ),
            )
            .catch(() => setRelated([]));
        }
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load this product.",
        ),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const button = addButtonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [product]);

  const optionGroups = useMemo(() => {
    const groups = new Map<
      string,
      Map<string, { value: string; hex?: string }>
    >();
    product?.variants.forEach((variant) => {
      variant.options.forEach((option) => {
        const group = groups.get(option.option) ?? new Map();
        group.set(option.value, {
          value: option.value,
          hex: option.metadata?.hex,
        });
        groups.set(option.option, group);
      });
    });
    return [...groups].map(([name, values]) => ({
      name,
      values: [...values.values()],
    }));
  }, [product]);

  const selectedVariant = product
    ? (findVariant(product, selections) ??
      (optionGroups.length === 0
        ? product.variants.find((variant) => variant.inStock)
        : undefined))
    : undefined;

  const images = useMemo(() => {
    if (!product) return [];
    const urls = product.images.map((image) => image.url);
    if (selectedVariant?.imageUrl) urls.unshift(selectedVariant.imageUrl);
    return [...new Set(urls)];
  }, [product, selectedVariant]);

  useEffect(() => setActiveImage(0), [selectedVariant?.id]);

  if (loading) {
    return (
      <div className="grid min-h-[70svh] place-items-center pt-20">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto grid min-h-[70svh] max-w-xl place-items-center px-4 pt-20 text-center">
        <div>
          <AlertCircle className="mx-auto mb-4 text-error" />
          <h1 className="font-serif text-2xl text-ink">
            {error || "Product not found"}
          </h1>
          <Link
            to="/shop"
            className="mt-5 inline-block text-sm underline underline-offset-4"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = Number(selectedVariant?.price ?? product.priceFrom);
  const regularPrice = Number(
    selectedVariant?.regularPrice ?? product.priceFrom,
  );
  const maxQuantity = selectedVariant?.stock ?? 0;
  const displayImage =
    images[activeImage] ?? selectedVariant?.imageUrl ?? productImage(product);

  const addToCart = () => {
    if (!selectedVariant?.inStock) return;
    const optionMap = Object.fromEntries(
      selectedVariant.options.map((option) => [option.option, option.value]),
    );
    addItem({
      id: selectedVariant.id,
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: displayImage,
      colorName: optionMap.Color ?? "",
      sizeName: optionMap.Size ?? variantLabel(selectedVariant),
      unitPrice: currentPrice,
      quantity,
      maxStock: selectedVariant.stock,
    });
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-24 sm:px-6 sm:pt-28 lg:pb-20">
      <nav
        className="mb-5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 text-xs text-muted sm:mb-8 sm:text-sm"
        aria-label="Breadcrumb"
      >
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <Link to="/shop">Shop</Link>
        {product.category && (
          <>
            <ChevronRight size={14} />
            <Link to={`/shop?category=${product.category.slug}`}>
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <div className="aspect-[4/5] overflow-hidden bg-surface">
            {displayImage ? (
              <motion.img
                key={displayImage}
                src={displayImage}
                alt={product.images[activeImage]?.alt ?? product.name}
                className="h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            ) : (
              <div className="grid h-full place-items-center text-muted">
                Image coming soon
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "h-20 w-16 shrink-0 overflow-hidden",
                    activeImage === index &&
                      "ring-2 ring-ink ring-offset-2 ring-offset-background",
                  )}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <p className="text-xs uppercase tracking-[0.15em] text-muted">
            {product.category?.name ?? "Swoosh Shop"}
          </p>
          <h1 className="font-serif text-3xl text-ink">{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">
              {formatCurrency(currentPrice)}
            </span>
            {regularPrice > currentPrice && (
              <span className="text-sm text-muted line-through">
                {formatCurrency(regularPrice)}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {product.shortDescription || product.description}
          </p>

          <div className="border-t border-line" />

          {optionGroups.map((group) => (
            <fieldset key={group.name}>
              <legend className="mb-3 text-xs uppercase tracking-wider text-muted">
                {group.name}
                {selections[group.name] && (
                  <span className="ml-2 normal-case tracking-normal text-ink">
                    — {selections[group.name]}
                  </span>
                )}
              </legend>
              <div className="flex flex-wrap gap-2">
                {group.values.map((option) => {
                  const selected = selections[group.name] === option.value;
                  const color = group.name.toLowerCase() === "color";
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        setSelections((current) => ({
                          ...current,
                          [group.name]: option.value,
                        }))
                      }
                      title={option.value}
                      className={cn(
                        color
                          ? "h-9 w-9 rounded-full border border-line"
                          : "min-h-11 min-w-12 border border-line px-3 text-sm",
                        selected &&
                          (color
                            ? "ring-2 ring-ink ring-offset-2"
                            : "border-ink bg-ink text-white"),
                      )}
                      style={
                        color
                          ? { backgroundColor: option.hex ?? "#d8d2ca" }
                          : undefined
                      }
                    >
                      {color ? (
                        <span className="sr-only">{option.value}</span>
                      ) : (
                        option.value
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {optionGroups.length > 0 && !selectedVariant && (
            <p className="text-sm text-error">
              This option combination is unavailable. Choose another option.
            </p>
          )}

          <div className="inline-flex items-center border border-line">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-12 w-12 place-items-center"
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-12 text-center text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              className="grid h-12 w-12 place-items-center"
              disabled={quantity >= maxQuantity}
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            ref={addButtonRef}
            type="button"
            onClick={addToCart}
            disabled={!selectedVariant?.inStock}
            className="min-h-12 w-full bg-ink px-5 text-sm font-medium uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedVariant?.inStock ? "Add to Bag" : "Out of Stock"}
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className="flex min-h-12 w-full items-center justify-center gap-2 border border-line text-sm font-medium uppercase tracking-widest"
          >
            <Heart
              size={17}
              className={cn(
                wishlist.includes(product.id) && "fill-ink text-ink",
              )}
            />
            {wishlist.includes(product.id) ? "Wishlisted" : "Add to Wishlist"}
          </button>

          <p className="flex items-center gap-2 text-xs text-muted">
            <Truck size={16} /> Delivery across Bangladesh in 2–5 business days.
          </p>

          <div className="border-t border-line">
            <button
              type="button"
              onClick={() =>
                setAccordion(accordion === "details" ? null : "details")
              }
              className="flex min-h-14 w-full items-center justify-between border-b border-line text-sm font-medium"
            >
              Product Details
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  accordion === "details" && "rotate-180",
                )}
              />
            </button>
            {accordion === "details" && (
              <div className="border-b border-line py-4 text-sm leading-relaxed text-muted">
                <p>{product.description}</p>
                {product.tags.length > 0 && (
                  <p className="mt-3 text-xs uppercase tracking-wider">
                    {product.tags.join(" · ")}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                setAccordion(accordion === "shipping" ? null : "shipping")
              }
              className="flex min-h-14 w-full items-center justify-between border-b border-line text-sm font-medium"
            >
              Shipping & Returns
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  accordion === "shipping" && "rotate-180",
                )}
              />
            </button>
            {accordion === "shipping" && (
              <div className="space-y-3 border-b border-line py-4 text-sm text-muted">
                <p className="flex gap-2">
                  <Truck size={16} className="mt-0.5 shrink-0" />
                  Dhaka delivery usually takes 2–3 business days; elsewhere
                  usually takes 3–5.
                </p>
                <p className="flex gap-2">
                  <RotateCcw size={16} className="mt-0.5 shrink-0" />
                  Exchanges are accepted within 7 days for unworn items with
                  original tags.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-surface px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden"
          >
            <span className="shrink-0 font-medium">
              {formatCurrency(currentPrice)}
            </span>
            <button
              type="button"
              onClick={addToCart}
              disabled={!selectedVariant?.inStock}
              className="min-h-12 flex-1 bg-ink px-3 text-sm uppercase tracking-widest text-white disabled:opacity-40"
            >
              {selectedVariant?.inStock ? "Add to Bag" : "Unavailable"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {related.length > 0 && (
        <section className="mt-16 sm:mt-20">
          <h2 className="mb-8 font-serif text-2xl text-ink sm:text-3xl">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {related.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group"
              >
                <div className="mb-3 aspect-[4/5] overflow-hidden bg-surface">
                  {productImage(item) ? (
                    <img
                      src={productImage(item)}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-muted">
                      Image coming soon
                    </div>
                  )}
                </div>
                <h3 className="truncate text-sm font-medium">{item.name}</h3>
                <p className="mt-1 text-sm">
                  {formatCurrency(Number(item.priceFrom))}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
