import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { apiFetch, apiFetchPage, ApiError } from "@/lib/api";
import {
  type CatalogProduct,
  type PublicCollection,
  productImage,
} from "@/lib/catalog";

export default function CollectionPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      apiFetch<PublicCollection>(`/collections/${encodeURIComponent(slug)}`),
      apiFetchPage<CatalogProduct>(
        `/products?collection=${encodeURIComponent(slug)}&pageSize=60`,
      ),
    ])
      .then(([nextCollection, result]) => {
        if (!active) return;
        setCollection(nextCollection);
        setProducts(result.items);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof ApiError && reason.status === 404
            ? "Collection not found."
            : "We could not load this collection. Please try again.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center pt-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 pt-24 text-center">
        <AlertCircle className="h-8 w-8 text-accent" />
        <p className="font-serif text-2xl text-ink">
          {error || "Collection not found."}
        </p>
        <Link to="/shop" className="text-sm underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <main>
      <section
        className={`relative flex min-h-[48svh] items-end overflow-hidden ${
          collection.bannerUrl ? "" : "bg-ink"
        }`}
      >
        {collection.bannerUrl && (
          <img
            src={collection.bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 sm:pb-16">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-white/70">
            Collection
          </p>
          <h1 className="font-serif text-4xl text-white sm:text-5xl md:text-7xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
              {collection.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            From the collection
          </h2>
          <span className="text-sm text-muted">{products.length} items</span>
        </div>
        {products.length === 0 ? (
          <div className="border border-line bg-surface px-6 py-16 text-center">
            <p className="font-serif text-xl text-ink">No products yet</p>
            <Link to="/shop" className="mt-3 inline-block text-sm underline">
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4 md:gap-6">
            {products.map((product) => {
              const image = productImage(product);
              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group min-w-0"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-surface">
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
                  </div>
                  <p className="mt-3 truncate text-sm font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatCurrency(Number(product.priceFrom))}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
