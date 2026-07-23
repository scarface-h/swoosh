import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  Heart,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { apiFetch, apiFetchPage, ApiError } from "@/lib/api";
import {
  type CatalogProduct,
  type PublicCategory,
  optionValues,
  productImage,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/stores/wishlistStore";
import { ProductGridSkeleton } from "@/components/catalog/CatalogSkeletons";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

function flattenCategories(
  categories: PublicCategory[],
  depth = 0,
): Array<PublicCategory & { depth: number }> {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const { items, toggleItem } = useWishlistStore();
  const image = productImage(product);
  const colors = optionValues(product, "Color");
  const lowestVariant = [...product.variants].sort(
    (a, b) => Number(a.price) - Number(b.price),
  )[0];
  const price = Number(lowestVariant?.price ?? product.priceFrom);
  const regularPrice = Number(lowestVariant?.regularPrice ?? product.priceFrom);

  return (
    <article className="group relative min-w-0">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          {image ? (
            <img
              src={image}
              alt={product.images[0]?.alt ?? product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center px-4 text-center text-sm text-muted">
              Image coming soon
            </div>
          )}
          {!product.inStock ? (
            <span className="absolute left-2 top-2 bg-muted px-2 py-1 text-[10px] uppercase tracking-widest text-white">
              Sold out
            </span>
          ) : lowestVariant?.onSale ? (
            <span className="absolute left-2 top-2 bg-accent px-2 py-1 text-[10px] uppercase tracking-widest text-white">
              Sale
            </span>
          ) : product.isNewArrival ? (
            <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[10px] uppercase tracking-widest text-white">
              New
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-xs uppercase text-muted">
          {product.category?.name ?? "Swoosh"}
        </p>
        <h2 className="mt-1 truncate text-sm font-medium text-ink">
          {product.name}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">{formatCurrency(price)}</span>
          {regularPrice > price && (
            <span className="text-sm text-muted line-through">
              {formatCurrency(regularPrice)}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleItem(product.id)}
        className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-surface/90 sm:right-2 sm:top-2"
        aria-label={
          items.includes(product.id)
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        }
      >
        <Heart
          className={cn(
            "h-4 w-4",
            items.includes(product.id) && "fill-accent text-accent",
          )}
        />
      </button>
      {colors.length > 0 && (
        <div className="mt-2 flex gap-1.5" aria-label="Available colours">
          {colors.slice(0, 5).map((color) => (
            <span
              key={color.value}
              title={color.value}
              className="h-3 w-3 rounded-full border border-line"
              style={{ backgroundColor: color.metadata?.hex ?? "#d8d2ca" }}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 border-b border-line pb-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-3 flex min-h-10 w-full items-center justify-between text-sm font-medium text-ink"
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && children}
    </div>
  );
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const category = searchParams.get("category") ?? "";
  const size = searchParams.get("size") ?? "";
  const inStock = searchParams.get("inStock") === "true";
  const sort = searchParams.get("sort") ?? "newest";

  useEffect(() => {
    apiFetch<PublicCategory[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const buildQuery = useCallback(
    (requestedPage: number) => {
      const query = new URLSearchParams({
        page: String(requestedPage),
        pageSize: "12",
        sort,
      });
      if (category) query.set("category", category);
      if (size) query.set("size", size);
      if (inStock) query.set("inStock", "true");
      const requestedSearch = searchParams.get("search");
      if (requestedSearch) query.set("search", requestedSearch);
      if (searchParams.get("filter") === "new") query.set("newArrival", "true");
      return query.toString();
    },
    [category, inStock, searchParams, size, sort],
  );

  const load = useCallback(
    async (requestedPage = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const result = await apiFetchPage<CatalogProduct>(
          `/products?${buildQuery(requestedPage)}`,
        );
        setProducts((current) =>
          append ? [...current, ...result.items] : result.items,
        );
        setTotal(result.total);
        setPage(requestedPage);
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load the catalogue.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  const updateFilter = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchParams({});
  };

  const filters = (
    <>
      <FilterSection title="Category">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => updateFilter("category")}
            className={cn(
              "block min-h-9 w-full text-left text-sm",
              !category ? "font-medium text-ink" : "text-muted",
            )}
          >
            All products
          </button>
          {flattenCategories(categories).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => updateFilter("category", item.slug)}
              className={cn(
                "flex min-h-9 w-full items-center justify-between text-left text-sm",
                category === item.slug ? "font-medium text-ink" : "text-muted",
              )}
            >
              <span style={{ paddingLeft: `${item.depth * 0.75}rem` }}>
                {item.depth > 0 ? "— " : ""}
                {item.name}
              </span>
              {item._count && (
                <span className="text-xs">{item._count.products}</span>
              )}
            </button>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Size">
        <div className="flex flex-wrap gap-2">
          {["XS", "S", "M", "L", "XL", "One Size"].map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => updateFilter("size", size === item ? "" : item)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-xs",
                size === item
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </FilterSection>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(event) =>
            updateFilter("inStock", event.target.checked ? "true" : "")
          }
          className="h-4 w-4 accent-ink"
        />
        In-stock products only
      </label>
      <button
        type="button"
        onClick={clearFilters}
        className="mt-5 text-sm text-muted underline underline-offset-4"
      >
        Clear all filters
      </button>
    </>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink sm:text-4xl md:text-5xl">
            Shop
          </h1>
          <p className="mt-2 text-sm text-muted">
            {loading ? "Loading catalogue…" : `${total} products`}
          </p>
        </div>
        <form
          className="flex w-full max-w-sm border-b border-line sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            updateFilter("search", search.trim());
          }}
        >
          <label htmlFor="catalogue-search" className="sr-only">
            Search products
          </label>
          <input
            id="catalogue-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
          />
          <button
            type="submit"
            className="grid min-h-11 min-w-11 place-items-center"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      <div className="mt-8 flex gap-10">
        <aside className="hidden w-56 shrink-0 lg:block">{filters}</aside>
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm lg:hidden"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <label className="ml-auto">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => updateFilter("sort", event.target.value)}
                className="min-h-11 rounded border border-line bg-white px-3 text-sm text-ink"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="grid min-h-72 place-items-center border border-line bg-surface p-6 text-center">
              <div>
                <AlertCircle className="mx-auto mb-3 text-error" />
                <p className="text-sm text-error">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 min-h-11 border border-ink px-5 text-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : loading ? (
            <ProductGridSkeleton count={9} />
          ) : products.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <p className="text-muted">No products match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-sm underline underline-offset-4"
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-3 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {products.length < total && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void load(page + 1, true)}
                    className="flex min-h-12 min-w-40 items-center justify-center gap-2 border border-ink px-6 text-sm disabled:opacity-50"
                  >
                    {loadingMore && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[min(88vw,22rem)] overflow-y-auto bg-surface p-5"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-medium text-ink">Filters</span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="grid h-11 w-11 place-items-center"
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>
              {filters}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
