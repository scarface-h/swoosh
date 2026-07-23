import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FolderTree,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tab, setTab] = useState<"categories" | "collections">("categories");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryImage, setCategoryImage] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionBanner, setCollectionBanner] = useState("");
  const [collectionFeatured, setCollectionFeatured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCategories, nextCollections] = await Promise.all([
        adminApiFetch<Category[]>("/admin/categories"),
        adminApiFetch<Collection[]>("/admin/collections"),
      ]);
      setCategories(nextCategories);
      setCollections(nextCollections);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Unable to load catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryPaths = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const pathFor = (category: Category) => {
      const path = [category.name];
      const seen = new Set([category.id]);
      let current = category;
      while (current.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent || seen.has(parent.id)) break;
        path.unshift(parent.name);
        seen.add(parent.id);
        current = parent;
      }
      return path.join(" / ");
    };
    return new Map(categories.map((category) => [category.id, pathFor(category)]));
  }, [categories]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        (categoryPaths.get(a.id) ?? a.name).localeCompare(
          categoryPaths.get(b.id) ?? b.name,
        ),
      ),
    [categories, categoryPaths],
  );

  const createCategory = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminApiFetch("/admin/categories", {
        method: "POST",
        body: {
          name: categoryName.trim(),
          slug: categorySlug || slugify(categoryName),
          description: categoryDescription.trim() || null,
          imageUrl: categoryImage.trim() || null,
          parentId: parentId || null,
          sortOrder: categories.length,
          isActive: true,
        },
      });
      setCategoryName("");
      setCategorySlug("");
      setParentId("");
      setCategoryDescription("");
      setCategoryImage("");
      setNotice("Category created. It is now available in products and the shop.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to create category.",
      );
    } finally {
      setSaving(false);
    }
  };

  const createCollection = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminApiFetch("/admin/collections", {
        method: "POST",
        body: {
          name: collectionName.trim(),
          slug: collectionSlug || slugify(collectionName),
          description: collectionDescription.trim() || null,
          bannerUrl: collectionBanner.trim() || null,
          isFeatured: collectionFeatured,
          isActive: true,
          sortOrder: collections.length,
        },
      });
      setCollectionName("");
      setCollectionSlug("");
      setCollectionDescription("");
      setCollectionBanner("");
      setCollectionFeatured(false);
      setNotice("Collection created and connected to the storefront.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to create collection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category: Category) => {
    await adminApiFetch(`/admin/categories/${category.id}`, {
      method: "PATCH",
      body: { isActive: !category.isActive },
    });
    await load();
  };

  const toggleCollection = async (collection: Collection) => {
    await adminApiFetch(`/admin/collections/${collection.id}`, {
      method: "PATCH",
      body: { isActive: !collection.isActive },
    });
    await load();
  };

  const toggleCollectionFeatured = async (collection: Collection) => {
    await adminApiFetch(`/admin/collections/${collection.id}`, {
      method: "PATCH",
      body: { isFeatured: !collection.isFeatured },
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Catalog</h1>
          <p className="mt-1 text-sm text-muted">
            One taxonomy powers product creation, filters, and storefront menus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface"
          aria-label="Refresh catalog"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="mb-5 flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm ${
            tab === "categories"
              ? "border-accent text-ink"
              : "border-transparent text-muted"
          }`}
        >
          <FolderTree size={17} /> Categories
        </button>
        <button
          type="button"
          onClick={() => setTab("collections")}
          className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm ${
            tab === "collections"
              ? "border-accent text-ink"
              : "border-transparent text-muted"
          }`}
        >
          <Layers3 size={17} /> Collections
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-line bg-surface">
          <Loader2 className="animate-spin text-accent" />
        </div>
      ) : tab === "categories" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(19rem,0.8fr)_1.2fr]">
          <form
            onSubmit={(event) => void createCategory(event)}
            className="h-fit rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-semibold text-ink">Add category</h2>
            <p className="mt-1 text-xs text-muted">
              Nest any product type under a department such as Men or Women.
            </p>
            <label className="mt-5 block text-sm font-medium">
              Name
              <input
                required
                value={categoryName}
                onChange={(event) => {
                  setCategoryName(event.target.value);
                  setCategorySlug(slugify(event.target.value));
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3 outline-none focus:border-accent"
                placeholder="e.g. Jackets"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              URL slug
              <input
                required
                value={categorySlug}
                onChange={(event) => setCategorySlug(slugify(event.target.value))}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3 outline-none focus:border-accent"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Parent category
              <select
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3"
              >
                <option value="">Top-level department</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryPaths.get(category.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium">
              Description
              <textarea
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-line bg-background p-3 outline-none focus:border-accent"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Cover image URL
              <input
                type="url"
                value={categoryImage}
                onChange={(event) => setCategoryImage(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3 outline-none focus:border-accent"
                placeholder="https://..."
              />
            </label>
            <button
              disabled={saving}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add category
            </button>
          </form>

          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold text-ink">Category hierarchy</h2>
              <p className="mt-1 text-xs text-muted">
                Parent filters automatically include products from children.
              </p>
            </div>
            <div className="divide-y divide-line">
              {sortedCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {categoryPaths.get(category.id)}
                    </p>
                    <p className="truncate text-xs text-muted">/{category.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleCategory(category)}
                    className={`min-h-9 rounded-full px-3 text-xs font-medium ${
                      category.isActive
                        ? "bg-success/10 text-success"
                        : "bg-background text-muted"
                    }`}
                  >
                    {category.isActive ? "Visible" : "Hidden"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(19rem,0.8fr)_1.2fr]">
          <form
            onSubmit={(event) => void createCollection(event)}
            className="h-fit rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-semibold text-ink">Add collection</h2>
            <p className="mt-1 text-xs text-muted">
              Curate campaigns such as New Arrivals or Eid Edit.
            </p>
            <label className="mt-5 block text-sm font-medium">
              Name
              <input
                required
                value={collectionName}
                onChange={(event) => {
                  setCollectionName(event.target.value);
                  setCollectionSlug(slugify(event.target.value));
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              URL slug
              <input
                required
                value={collectionSlug}
                onChange={(event) => setCollectionSlug(slugify(event.target.value))}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Description
              <textarea
                value={collectionDescription}
                onChange={(event) => setCollectionDescription(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-line bg-background p-3"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Banner image URL
              <input
                type="url"
                value={collectionBanner}
                onChange={(event) => setCollectionBanner(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3"
                placeholder="https://..."
              />
            </label>
            <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={collectionFeatured}
                onChange={(event) => setCollectionFeatured(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Feature this collection
            </label>
            <button
              disabled={saving}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add collection
            </button>
          </form>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold text-ink">Collections</h2>
            </div>
            {collections.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted">
                No collections yet.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex min-h-16 items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {collection.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        /collection/{collection.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void toggleCollectionFeatured(collection)
                        }
                        className={`min-h-9 rounded-full px-3 text-xs font-medium ${
                          collection.isFeatured
                            ? "bg-warning/10 text-warning"
                            : "bg-background text-muted"
                        }`}
                      >
                        {collection.isFeatured
                          ? "Homepage featured"
                          : "Feature on homepage"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleCollection(collection)}
                        className={`min-h-9 rounded-full px-3 text-xs font-medium ${
                          collection.isActive
                            ? "bg-success/10 text-success"
                            : "bg-background text-muted"
                        }`}
                      >
                        {collection.isActive ? "Visible" : "Hidden"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
