import { useCallback, useEffect, useState } from "react";
import {
  Edit3,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import ProductEditModal from "@/components/products/ProductEditModal";
import ProductCreateModal, {
  type Category,
  type Collection,
} from "@/components/products/ProductCreateModal";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  regularPrice: string;
  salePrice: string | null;
  category: Category;
  images: Array<{ id: string; url: string; altText: string | null }>;
  variants: Array<{ id: string }>;
  isFeatured: boolean;
  isNewArrival: boolean;
  collections: Array<{ collectionId: string }>;
}

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProductId, setEditProductId] = useState("");
  const [updating, setUpdating] = useState("");
  const [placementProduct, setPlacementProduct] = useState<Product | null>(
    null,
  );
  const [placementFeatured, setPlacementFeatured] = useState(false);
  const [placementNewArrival, setPlacementNewArrival] = useState(false);
  const [placementCollections, setPlacementCollections] = useState<string[]>(
    [],
  );
  const [savingPlacement, setSavingPlacement] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productItems, categoryItems, collectionItems] = await Promise.all([
        adminApiFetch<Product[]>("/admin/products?page=1&pageSize=100"),
        adminApiFetch<Category[]>("/admin/categories"),
        adminApiFetch<Collection[]>("/admin/collections"),
      ]);
      setProducts(productItems);
      setCategories(categoryItems);
      setCollections(collectionItems);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load products.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePublishing = async (product: Product) => {
    setUpdating(product.id);
    setError("");
    try {
      const action = product.status === "ACTIVE" ? "archive" : "publish";
      await adminApiFetch(`/admin/products/${product.id}/${action}`, {
        method: "POST",
      });
      setNotice(
        product.status === "ACTIVE"
          ? "Product archived and hidden from the shop."
          : "Product published and visible in the shop.",
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update the product.",
      );
    } finally {
      setUpdating("");
    }
  };

  const openPlacement = (product: Product) => {
    setPlacementProduct(product);
    setPlacementFeatured(product.isFeatured);
    setPlacementNewArrival(product.isNewArrival);
    setPlacementCollections(
      product.collections.map((collection) => collection.collectionId),
    );
    setError("");
  };

  const savePlacement = async () => {
    if (!placementProduct) return;
    setSavingPlacement(true);
    setError("");
    try {
      await adminApiFetch(`/admin/products/${placementProduct.id}`, {
        method: "PATCH",
        body: {
          isFeatured: placementFeatured,
          isNewArrival: placementNewArrival,
          collectionIds: placementCollections,
        },
      });
      setPlacementProduct(null);
      setNotice(
        "Storefront placement saved. Active products update on the shop automatically.",
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to save storefront placement.",
      );
    } finally {
      setSavingPlacement(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="grid h-11 w-11 place-items-center rounded-lg border border-line"
            aria-label="Refresh products"
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setCreateOpen(true);
            }}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"
          >
            <Plus size={17} /> Add Product
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-ink">
        <p className="font-medium">Homepage placement</p>
        <p className="mt-1 leading-relaxed text-muted">
          Use <strong>Placement</strong> on any product to add it to New
          Arrivals, Crafted for You / Customer Favourites, or one or more
          collections. The product must be published and have stock to appear
          for customers.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={17} className="animate-spin text-accent" />
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <PackagePlus size={28} className="mb-4 text-muted" />
            <p className="font-medium">No products yet</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"
            >
              <Plus size={17} /> Add Product
            </button>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {products.map((product) => (
              <article
                key={product.id}
                className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,2fr)_1fr_7rem_8rem_7rem_auto] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-background">
                    {product.images[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].altText ?? product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full place-items-center">
                        <PackagePlus size={17} className="text-muted" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      /{product.slug}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted">{product.category.name}</p>
                <span
                  className={
                    product.status === "ACTIVE"
                      ? "text-sm text-success"
                      : product.status === "ARCHIVED"
                        ? "text-sm text-error"
                        : "text-sm text-warning"
                  }
                >
                  {product.status.toLowerCase()}
                </span>
                <p className="text-sm font-medium">
                  {money.format(
                    Number(product.salePrice ?? product.regularPrice),
                  )}
                </p>
                <div className="flex flex-wrap gap-1">
                  {product.isNewArrival && (
                    <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
                      NEW
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                      FEATURED
                    </span>
                  )}
                  {!product.isFeatured && !product.isNewArrival && (
                    <span className="text-xs text-muted">
                      {product.variants.length} variants
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotice("");
                      setEditProductId(product.id);
                    }}
                    className="flex min-h-10 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm text-white"
                  >
                    <Edit3 size={15} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openPlacement(product)}
                    className="flex min-h-10 items-center gap-1.5 rounded-lg border border-accent px-3 text-sm text-accent"
                  >
                    <Sparkles size={15} /> Placement
                  </button>
                  <button
                    type="button"
                    disabled={updating === product.id}
                    onClick={() => void updatePublishing(product)}
                    className="min-h-10 rounded-lg border border-line px-3 text-sm disabled:opacity-50"
                  >
                    {product.status === "ACTIVE" ? "Archive" : "Publish"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <ProductCreateModal
          categories={categories}
          collections={collections}
          onClose={() => setCreateOpen(false)}
          onCreated={(message) => {
            setCreateOpen(false);
            setNotice(message);
            void load();
          }}
        />
      )}

      {editProductId && (
        <ProductEditModal
          productId={editProductId}
          categories={categories}
          collections={collections}
          onClose={() => setEditProductId("")}
          onSaved={(message) => {
            setNotice(message);
            void load();
          }}
        />
      )}

      {placementProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close placement editor"
            onClick={() => setPlacementProduct(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="placement-title"
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-accent">
                  Storefront merchandising
                </p>
                <h2
                  id="placement-title"
                  className="mt-1 text-xl font-semibold text-ink"
                >
                  {placementProduct.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPlacementProduct(null)}
                className="grid h-11 w-11 place-items-center"
                aria-label="Close placement editor"
              >
                <X size={20} />
              </button>
            </div>

            {placementProduct.status !== "ACTIVE" && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                This product is not published. Save placement now, then publish
                it from the product list.
              </div>
            )}

            <div className="mt-5 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
                <input
                  type="checkbox"
                  checked={placementNewArrival}
                  onChange={(event) =>
                    setPlacementNewArrival(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    New Arrivals / Just Dropped
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Adds the product to the homepage New Arrivals rail.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
                <input
                  type="checkbox"
                  checked={placementFeatured}
                  onChange={(event) =>
                    setPlacementFeatured(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Crafted for You / Customer Favourites
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Uses the product in the crafted campaign imagery and
                    featured product grid.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-ink">
                Collection membership
              </p>
              <p className="mt-1 text-xs text-muted">
                Products appear on every selected collection page.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={placementCollections.includes(collection.id)}
                      onChange={(event) =>
                        setPlacementCollections((current) =>
                          event.target.checked
                            ? [...current, collection.id]
                            : current.filter((id) => id !== collection.id),
                        )
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    {collection.name}
                  </label>
                ))}
                {collections.length === 0 && (
                  <p className="text-sm text-muted">
                    Create a collection under Catalog first.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPlacementProduct(null)}
                className="min-h-11 rounded-lg border border-line px-5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPlacement}
                onClick={() => void savePlacement()}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingPlacement && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Save placement
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
