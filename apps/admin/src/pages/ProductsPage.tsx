import { useCallback, useEffect, useState } from "react";
import { Loader2, PackagePlus, Plus, RefreshCw } from "lucide-react";
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
  const [updating, setUpdating] = useState("");

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

  const toggleArchive = async (product: Product) => {
    setUpdating(product.id);
    setError("");
    try {
      const action = product.status === "ARCHIVED" ? "restore" : "archive";
      await adminApiFetch(`/admin/products/${product.id}/${action}`, {
        method: "POST",
      });
      setNotice(
        product.status === "ARCHIVED"
          ? "Product restored as a draft."
          : "Product archived.",
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
                className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,2fr)_1fr_7rem_8rem_5rem_auto] md:items-center"
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
                <p className="text-sm text-muted">
                  {product.variants.length} variants
                </p>
                <button
                  type="button"
                  disabled={updating === product.id}
                  onClick={() => void toggleArchive(product)}
                  className="min-h-10 rounded-lg border border-line px-3 text-sm disabled:opacity-50"
                >
                  {product.status === "ARCHIVED" ? "Restore" : "Archive"}
                </button>
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
    </div>
  );
}
