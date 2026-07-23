import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

export interface Category {
  id: string;
  name: string;
}

interface CreatedProduct {
  id: string;
}

interface UploadSignature {
  provider: "cloudinary" | "s3";
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  fields?: Record<string, string | number | boolean>;
}

interface CloudinaryUpload {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

interface ProductCreateModalProps {
  categories: Category[];
  onClose: () => void;
  onCreated: (message: string) => void;
}

const initialForm = {
  name: "",
  slug: "",
  categoryId: "",
  skuPrefix: "",
  shortDescription: "",
  description: "",
  regularPrice: "",
  salePrice: "",
  status: "DRAFT" as "DRAFT" | "ACTIVE",
  tags: "",
  isFeatured: false,
  isNewArrival: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to create the product. Please try again.";
}

export default function ProductCreateModal({
  categories,
  onClose,
  onCreated,
}: ProductCreateModalProps) {
  const [form, setForm] = useState({
    ...initialForm,
    categoryId: categories[0]?.id ?? "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const imagePreview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, submitting]);

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (productId: string, file: File) => {
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

    if (signature.provider === "cloudinary") {
      const uploadBody = new FormData();
      uploadBody.append("file", file);
      Object.entries(signature.fields ?? {}).forEach(([key, value]) => {
        uploadBody.append(key, String(value));
      });

      const response = await fetch(signature.uploadUrl, {
        method: "POST",
        body: uploadBody,
      });
      if (!response.ok)
        throw new Error("Cloudinary rejected the image upload.");

      const uploaded = (await response.json()) as CloudinaryUpload;
      await adminApiFetch(`/admin/products/${productId}/images`, {
        method: "POST",
        body: {
          url: uploaded.secure_url,
          objectKey: uploaded.public_id,
          altText: form.name,
          mimeType: file.type,
          width: uploaded.width,
          height: uploaded.height,
          sortOrder: 0,
          isPrimary: true,
        },
      });
      return;
    }

    const response = await fetch(signature.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok || !signature.publicUrl) {
      throw new Error("Object storage rejected the image upload.");
    }

    await adminApiFetch(`/admin/products/${productId}/images`, {
      method: "POST",
      body: {
        url: signature.publicUrl,
        objectKey: signature.objectKey,
        altText: form.name,
        mimeType: file.type,
        sortOrder: 0,
        isPrimary: true,
      },
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const product = await adminApiFetch<CreatedProduct>("/admin/products", {
        method: "POST",
        body: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          categoryId: form.categoryId,
          skuPrefix: form.skuPrefix.trim() || null,
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim(),
          regularPrice: Number(form.regularPrice),
          salePrice: form.salePrice ? Number(form.salePrice) : null,
          status: form.status,
          isFeatured: form.isFeatured,
          isNewArrival: form.isNewArrival,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          collectionIds: [],
        },
      });

      if (image) {
        try {
          await uploadImage(product.id, image);
        } catch (uploadError) {
          onCreated(
            `Product created, but its image was not uploaded: ${errorMessage(uploadError)}`,
          );
          return;
        }
      }

      onCreated("Product created successfully.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-product-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2
              id="create-product-title"
              className="text-xl font-semibold text-ink"
            >
              Add Product
            </h2>
            <p className="mt-1 text-sm text-muted">
              Create the product first; variants can be added afterward.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-background hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
          {error && (
            <div
              className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {categories.length === 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
              No categories are available. Seed or create a category before
              adding products.
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Product name
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  update("name", name);
                  if (!slugEdited) update("slug", slugify(name));
                }}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                URL slug
              </span>
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  update("slug", slugify(event.target.value));
                }}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Category
              </span>
              <select
                required
                value={form.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Regular price (BDT)
              </span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.regularPrice}
                onChange={(event) => update("regularPrice", event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Sale price (optional)
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(event) => update("salePrice", event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                SKU prefix (optional)
              </span>
              <input
                maxLength={60}
                value={form.skuPrefix}
                onChange={(event) => update("skuPrefix", event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value as "DRAFT" | "ACTIVE")
                }
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
              </select>
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Short description (optional)
              </span>
              <input
                maxLength={500}
                value={form.shortDescription}
                onChange={(event) =>
                  update("shortDescription", event.target.value)
                }
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Description
              </span>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Tags
              </span>
              <input
                value={form.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="linen, summer, everyday"
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="mt-1 block text-xs text-muted">
                Separate tags with commas.
              </span>
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-ink">
              Primary image (optional)
            </span>
            <label className="flex min-h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-background text-center hover:border-accent">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-44 w-full object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-2 px-4 py-6 text-sm text-muted">
                  <ImagePlus size={24} />
                  Choose a JPG, PNG, WebP, or AVIF image up to 10 MB
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  if (selected && selected.size > 10 * 1024 * 1024) {
                    setError("The image must be 10 MB or smaller.");
                    event.target.value = "";
                    setImage(null);
                    return;
                  }
                  setError("");
                  setImage(selected);
                }}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    update("isFeatured", event.target.checked)
                  }
                  className="h-4 w-4 accent-accent"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-11 rounded-lg border border-line px-5 text-sm font-medium text-ink hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || categories.length === 0}
                className="flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Creating…" : "Create Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
