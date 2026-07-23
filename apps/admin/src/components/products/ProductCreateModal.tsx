import { useEffect, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

export interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  onClose: () => void;
  onCreated: (message: string) => void;
}

interface UploadSignature {
  provider: "cloudinary" | "s3";
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  fields?: Record<string, string | number | boolean>;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const fieldLabels: Record<string, string> = {
  name: "Product name",
  slug: "URL slug",
  categoryId: "Category",
  skuPrefix: "SKU prefix",
  shortDescription: "Short description",
  description: "Description",
  regularPrice: "Regular price",
  salePrice: "Sale price",
  status: "Status",
  tags: "Tags",
  collectionIds: "Collections",
  sku: "Variant SKU",
  optionValueIds: "Variant options",
  quantity: "Initial stock",
};

const messageFor = (error: unknown) => {
  if (error instanceof ApiError) {
    const details = Object.entries(error.fields ?? {})
      .flatMap(([field, messages]) =>
        messages.map(
          (message) => `${fieldLabels[field] ?? field}: ${message}`,
        ),
      )
      .join(" ");
    return details ? `${error.message}. ${details}` : error.message;
  }
  return error instanceof Error
    ? error.message
    : "Unable to create the product.";
};

export default function ProductCreateModal({
  categories,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryId: categories[0]?.id ?? "",
    skuPrefix: "",
    shortDescription: "",
    description: "",
    regularPrice: "",
    salePrice: "",
    status: "DRAFT" as "DRAFT" | "ACTIVE",
    tags: "",
    variantSku: "",
    color: "",
    colorHex: "#1a1a1a",
    size: "",
    initialStock: "0",
    isFeatured: false,
    isNewArrival: false,
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const attachImage = async (productId: string, file: File) => {
    const signature = await adminApiFetch<UploadSignature>(
      "/admin/uploads/presign",
      {
        method: "POST",
        body: {
          mimeType: file.type,
          fileSize: file.size,
          purpose: "product",
        },
      },
    );

    let url = signature.publicUrl;
    let objectKey = signature.objectKey;
    let dimensions: { width?: number; height?: number } = {};

    if (signature.provider === "cloudinary") {
      const body = new FormData();
      body.append("file", file);
      Object.entries(signature.fields ?? {}).forEach(([key, value]) =>
        body.append(key, String(value)),
      );
      const response = await fetch(signature.uploadUrl, {
        method: "POST",
        body,
      });
      if (!response.ok) throw new Error("Cloudinary rejected the image.");
      const uploaded = (await response.json()) as {
        secure_url: string;
        public_id: string;
        width?: number;
        height?: number;
      };
      url = uploaded.secure_url;
      objectKey = uploaded.public_id;
      dimensions = { width: uploaded.width, height: uploaded.height };
    } else {
      const response = await fetch(signature.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Object storage rejected the image.");
    }

    if (!url)
      throw new Error("The upload provider did not return an image URL.");
    await adminApiFetch(`/admin/products/${productId}/images`, {
      method: "POST",
      body: {
        url,
        objectKey,
        altText: form.name.trim(),
        mimeType: file.type,
        ...dimensions,
        sortOrder: 0,
        isPrimary: true,
      },
    });
  };

  const createInitialVariant = async (productId: string) => {
    const optionValueIds: string[] = [];
    for (const option of [
      {
        name: "Color",
        value: form.color.trim(),
        metadata: { hex: form.colorHex },
      },
      { name: "Size", value: form.size.trim(), metadata: undefined },
    ]) {
      if (!option.value) continue;
      const created = await adminApiFetch<{
        values: Array<{ id: string }>;
      }>(`/admin/products/${productId}/options`, {
        method: "POST",
        body: {
          name: option.name,
          sortOrder: option.name === "Color" ? 0 : 1,
          values: [
            {
              value: option.value,
              ...(option.metadata ? { metadata: option.metadata } : {}),
              sortOrder: 0,
            },
          ],
        },
      });
      optionValueIds.push(created.values[0].id);
    }

    const variant = await adminApiFetch<{ id: string }>(
      `/admin/products/${productId}/variants`,
      {
        method: "POST",
        body: {
          sku: form.variantSku.trim(),
          lowStockThreshold: 5,
          isActive: true,
          optionValueIds,
        },
      },
    );
    const stock = Number(form.initialStock);
    if (stock > 0) {
      await adminApiFetch("/admin/inventory/adjust", {
        method: "POST",
        body: {
          variantId: variant.id,
          quantity: stock,
          type: "RESTOCK",
          reason: "Initial stock entered during product creation",
        },
      });
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const regularPrice = Number(form.regularPrice);
    const salePrice = form.salePrice ? Number(form.salePrice) : null;
    const initialStock = Number(form.initialStock);
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const validationError =
      !form.name.trim()
        ? "Enter a product name."
        : !form.slug.trim()
          ? "Enter a valid URL slug."
          : !form.categoryId
            ? "Select a category."
            : !form.variantSku.trim()
              ? "Enter an initial variant SKU."
              : !form.size.trim() && !form.color.trim()
                ? "Enter at least one variant option: size or colour."
                : !form.description.trim()
                  ? "Enter a product description."
                  : !Number.isFinite(regularPrice) || regularPrice <= 0
                    ? "Regular price must be greater than zero."
                    : salePrice !== null &&
                        (!Number.isFinite(salePrice) || salePrice <= 0)
                      ? "Sale price must be greater than zero."
                      : salePrice !== null && salePrice >= regularPrice
                        ? "Sale price must be lower than the regular price."
                        : !Number.isInteger(initialStock) || initialStock < 0
                          ? "Initial stock must be a whole number of zero or more."
                          : tags.length > 30
                            ? "Use no more than 30 tags."
                            : tags.some((tag) => tag.length > 50)
                              ? "Each tag must be 50 characters or shorter."
                              : "";
    if (validationError) {
      setError(validationError);
      return;
    }
    if (image && image.size > 10 * 1024 * 1024) {
      setError("The image must be 10 MB or smaller.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const product = await adminApiFetch<{ id: string }>("/admin/products", {
        method: "POST",
        body: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          categoryId: form.categoryId,
          skuPrefix: form.skuPrefix.trim() || null,
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim(),
          regularPrice,
          salePrice,
          status: form.status,
          isFeatured: form.isFeatured,
          isNewArrival: form.isNewArrival,
          tags,
          collectionIds: [],
        },
      });

      try {
        await createInitialVariant(product.id);
      } catch (variantError) {
        onCreated(
          `Product created, but its initial variant failed: ${messageFor(variantError)}`,
        );
        return;
      }

      if (image) {
        try {
          await attachImage(product.id, image);
        } catch (uploadError) {
          onCreated(
            `Product created, but the image failed: ${messageFor(uploadError)}`,
          );
          return;
        }
      }
      onCreated("Product created successfully.");
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-create-title"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="product-create-title" className="text-xl font-semibold">
              Add Product
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add variants and inventory after creating the base product.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-11 w-11 place-items-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          {error && (
            <div
              className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}
          {categories.length === 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
              Create or seed a category before adding products.
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Product name
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.name}
                onChange={(event) => {
                  update("name", event.target.value);
                  if (!slugEdited) update("slug", slugify(event.target.value));
                }}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">URL slug</span>
              <input
                required
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  update("slug", slugify(event.target.value));
                }}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                className={fieldClass}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                Initial variant SKU
              </span>
              <input
                required
                maxLength={100}
                value={form.variantSku}
                onChange={(event) => update("variantSku", event.target.value)}
                className={fieldClass}
                placeholder="TEE-BLK-M"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                Initial stock
              </span>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.initialStock}
                onChange={(event) => update("initialStock", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Colour</span>
              <div className="flex gap-2">
                <input
                  value={form.color}
                  onChange={(event) => update("color", event.target.value)}
                  className={fieldClass}
                  placeholder="Black"
                />
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(event) => update("colorHex", event.target.value)}
                  className="h-11 w-14 rounded-lg border border-line bg-white p-1"
                  aria-label="Colour swatch"
                />
              </div>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Size</span>
              <input
                value={form.size}
                onChange={(event) => update("size", event.target.value)}
                className={fieldClass}
                placeholder="M or One Size"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                Regular price (BDT)
              </span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.regularPrice}
                onChange={(event) => update("regularPrice", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                Sale price
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.salePrice}
                onChange={(event) => update("salePrice", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                SKU prefix
              </span>
              <input
                maxLength={60}
                value={form.skuPrefix}
                onChange={(event) => update("skuPrefix", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value as "DRAFT" | "ACTIVE")
                }
                className={fieldClass}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Short description
              </span>
              <input
                maxLength={500}
                value={form.shortDescription}
                onChange={(event) =>
                  update("shortDescription", event.target.value)
                }
                className={fieldClass}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Description
              </span>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className={`${fieldClass} py-3`}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Tags</span>
              <input
                value={form.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="linen, summer, everyday"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="flex min-h-28 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-background px-4 text-sm text-muted hover:border-accent">
            <ImagePlus size={22} />
            {image
              ? image.name
              : "Choose a product image (optional, max 10 MB)"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => update("isFeatured", event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isNewArrival}
                onChange={(event) =>
                  update("isNewArrival", event.target.checked)
                }
                className="h-4 w-4 accent-accent"
              />
              New arrival
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-lg border border-line px-5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || categories.length === 0}
              className="flex min-h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Creating…" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
