import { useCallback, useEffect, useState } from "react";
import { Loader2, PackagePlus, Plus, RefreshCw } from "lucide-react";
import ProductCreateModal, {
  type Category,
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

function requestError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Unable to load products. Please try again.";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [productItems, categoryItems] = await Promise.all([
        adminApiFetch<Product[]>("/admin/products?page=1&pageSize=100"),
        adminApiFetch<Category[]>("/admin/categories"),
      ]);
      setProducts(productItems);
      setCategories(categoryItems);
    } catch (error) {
      setLoadError(requestError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setCreateOpen(true);
          }}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Plus size={17} />
          Add Product
        </button>
      </div>

      {notice && (
        <div
          className="mb-4 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success"
          role="status"
        >
          {notice}
        </div>
      )}

      {loadError && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-error/30 px-3 font-medium"
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted">
            <Loader2 size={18} className="animate-spin text-accent" />
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-background text-muted">
              <PackagePlus size={24} />
            </span>
            <p className="font-medium text-ink">No products yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Add your first product to begin building the Swoosh Shop
              catalogue.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white"
            >
              <Plus size={17} /> Add Product
            </button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_7rem_8rem_6rem] gap-4 border-b border-line bg-background px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted md:grid">
              <span>Product</span>
              <span>Category</span>
              <span>Status</span>
              <span>Price</span>
              <span>Variants</span>
            </div>
            <div className="divide-y divide-line">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_7rem_8rem_6rem] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded-md bg-background">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText ?? product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-muted">
                          <PackagePlus size={18} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {product.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        /{product.slug}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    <span className="mr-2 text-xs uppercase text-muted md:hidden">
                      Category
                    </span>
                    {product.category.name}
                  </p>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.status === "ACTIVE"
                          ? "bg-success/10 text-success"
                          : product.status === "ARCHIVED"
                            ? "bg-error/10 text-error"
                            : "bg-warning/10 text-ink"
                      }`}
                    >
                      {product.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink">
                    {money.format(
                      Number(product.salePrice ?? product.regularPrice),
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    <span className="mr-2 text-xs uppercase md:hidden">
                      Variants
                    </span>
                    {product.variants.length}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {createOpen && (
        <ProductCreateModal
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onCreated={(message) => {
            setCreateOpen(false);
            setNotice(message);
            void loadProducts();
          }}
        />
      )}
    </div>
  );
}
