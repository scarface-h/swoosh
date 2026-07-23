import { useEffect, useState } from "react";
import {
  Box,
  Check,
  Copy,
  FileSearch,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";
import type {
  Category,
  Collection,
} from "@/components/products/ProductCreateModal";

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}
interface OptionValue {
  id: string;
  value: string;
  metadata?: { hex?: string } | null;
  sortOrder: number;
}
interface ProductOption {
  id: string;
  name: string;
  sortOrder: number;
  values: OptionValue[];
}
interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  priceOverride: string | null;
  salePriceOverride: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  stock: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  imageId: string | null;
  isActive: boolean;
  optionValues: Array<{
    value: { id: string; value: string; option: { name: string } };
  }>;
}
interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  skuPrefix: string | null;
  brand: string | null;
  productType: string | null;
  vendor: string | null;
  countryOfOrigin: string | null;
  hsCode: string | null;
  attributes: Record<string, string> | null;
  shortDescription: string | null;
  description: string;
  regularPrice: string;
  salePrice: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  isNewArrival: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  collections: Array<{ collectionId: string }>;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
}
interface UploadSignature {
  provider: "cloudinary" | "s3";
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  fields?: Record<string, string | number | boolean>;
}
interface Props {
  productId: string;
  categories: Category[];
  collections: Collection[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

type Section = "details" | "media" | "variants" | "seo";
const sections: Array<{
  id: Section;
  label: string;
  icon: typeof Package;
}> = [
  { id: "details", label: "Product details", icon: Package },
  { id: "media", label: "Media gallery", icon: ImagePlus },
  { id: "variants", label: "Options & variants", icon: Box },
  { id: "seo", label: "SEO & publishing", icon: FileSearch },
];
const input =
  "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";
const label = "mb-1.5 block text-sm font-medium text-ink";
const emptyToNull = (value: string | null | undefined) =>
  value?.trim() ? value.trim() : null;
const localDate = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "The product could not be updated.";

export default function ProductEditModal({
  productId,
  categories,
  collections,
  onClose,
  onSaved,
}: Props) {
  const [section, setSection] = useState<Section>("details");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [specifications, setSpecifications] = useState<
    Array<{ id: string; name: string; value: string }>
  >([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState("");
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [newVariant, setNewVariant] = useState({
    sku: "",
    barcode: "",
    priceOverride: "",
    salePriceOverride: "",
    lowStockThreshold: "5",
    weightGrams: "",
    optionValueIds: {} as Record<string, string>,
  });
  const [stockAdjustments, setStockAdjustments] = useState<
    Record<string, string>
  >({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const item = await adminApiFetch<ProductDetail>(
        `/admin/products/${productId}`,
      );
      setProduct(item);
      setCollectionIds(item.collections.map((entry) => entry.collectionId));
      setSpecifications(
        Object.entries(item.attributes ?? {}).map(([name, value]) => ({
          id: crypto.randomUUID(),
          name,
          value: String(value),
        })),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void load();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [productId]);

  const update = <K extends keyof ProductDetail>(
    key: K,
    value: ProductDetail[K],
  ) => setProduct((current) => (current ? { ...current, [key]: value } : null));

  const saveBase = async () => {
    if (!product || saving) return;
    if (
      !product.name.trim() ||
      !product.slug.trim() ||
      !product.description.trim()
    ) {
      setError("Name, URL slug, and description are required.");
      return;
    }
    const regularPrice = Number(product.regularPrice);
    const salePrice = product.salePrice ? Number(product.salePrice) : null;
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      setError("Regular price must be greater than zero.");
      return;
    }
    if (salePrice !== null && (salePrice <= 0 || salePrice >= regularPrice)) {
      setError("Sale price must be lower than the regular price.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminApiFetch(`/admin/products/${product.id}`, {
        method: "PATCH",
        body: {
          name: product.name.trim(),
          slug: product.slug.trim(),
          categoryId: product.categoryId,
          skuPrefix: emptyToNull(product.skuPrefix),
          brand: emptyToNull(product.brand),
          productType: emptyToNull(product.productType),
          vendor: emptyToNull(product.vendor),
          countryOfOrigin: emptyToNull(product.countryOfOrigin),
          hsCode: emptyToNull(product.hsCode),
          attributes: Object.fromEntries(
            specifications
              .filter((item) => item.name.trim() && item.value.trim())
              .map((item) => [item.name.trim(), item.value.trim()]),
          ),
          shortDescription: emptyToNull(product.shortDescription),
          description: product.description.trim(),
          regularPrice,
          salePrice,
          saleStartsAt: product.saleStartsAt
            ? new Date(product.saleStartsAt).toISOString()
            : null,
          saleEndsAt: product.saleEndsAt
            ? new Date(product.saleEndsAt).toISOString()
            : null,
          status: product.status,
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          tags: product.tags,
          seoTitle: emptyToNull(product.seoTitle),
          seoDescription: emptyToNull(product.seoDescription),
          collectionIds,
        },
      });
      setNotice(
        "Product details saved. The storefront uses these changes automatically.",
      );
      onSaved("Product updated successfully.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!product || !files?.length) return;
    const accepted = Array.from(files).filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      ),
    );
    if (product.images.length + accepted.length > 12) {
      setError("A product can have up to 12 images.");
      return;
    }
    setBusy("images");
    setError("");
    try {
      for (const [offset, file] of accepted.entries()) {
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
          if (!response.ok) throw new Error("The image upload was rejected.");
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
          if (!response.ok) throw new Error("The image upload was rejected.");
        }
        if (!url) throw new Error("The upload provider returned no image URL.");
        await adminApiFetch(`/admin/products/${product.id}/images`, {
          method: "POST",
          body: {
            url,
            objectKey,
            altText: product.name,
            mimeType: file.type,
            ...dimensions,
            sortOrder: product.images.length + offset,
            isPrimary: product.images.length === 0 && offset === 0,
          },
        });
      }
      setNotice(
        `${accepted.length} image${accepted.length === 1 ? "" : "s"} uploaded.`,
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const patchImage = async (
    imageId: string,
    changes: {
      altText?: string | null;
      isPrimary?: boolean;
      sortOrder?: number;
    },
  ) => {
    setBusy(imageId);
    try {
      await adminApiFetch(`/admin/images/${imageId}`, {
        method: "PATCH",
        body: changes,
      });
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!window.confirm("Delete this product image?")) return;
    setBusy(imageId);
    try {
      await adminApiFetch(`/admin/images/${imageId}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const saveOption = async (option: ProductOption) => {
    setBusy(option.id);
    setError("");
    try {
      await adminApiFetch(`/admin/options/${option.id}`, {
        method: "PATCH",
        body: { name: option.name, sortOrder: option.sortOrder },
      });
      for (const value of option.values) {
        await adminApiFetch(`/admin/option-values/${value.id}`, {
          method: "PATCH",
          body: {
            value: value.value,
            sortOrder: value.sortOrder,
            metadata: value.metadata ?? null,
          },
        });
      }
      setNotice(`${option.name} option saved.`);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const addOption = async () => {
    if (!product) return;
    const values = newOptionValues
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!newOptionName.trim() || !values.length) {
      setError("Enter an option name and comma-separated values.");
      return;
    }
    setBusy("option-new");
    try {
      await adminApiFetch(`/admin/products/${product.id}/options`, {
        method: "POST",
        body: {
          name: newOptionName.trim(),
          sortOrder: product.options.length,
          values: values.map((value, index) => ({
            value,
            sortOrder: index,
          })),
        },
      });
      setNewOptionName("");
      setNewOptionValues("");
      setNotice("Option added. Create variants using its values below.");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const addOptionValue = async (option: ProductOption) => {
    const value = newValues[option.id]?.trim();
    if (!value) return;
    setBusy(`value-${option.id}`);
    try {
      await adminApiFetch(`/admin/options/${option.id}/values`, {
        method: "POST",
        body: { value, sortOrder: option.values.length },
      });
      setNewValues((current) => ({ ...current, [option.id]: "" }));
      setNotice(`${value} added to ${option.name}.`);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const createVariant = async () => {
    if (!product) return;
    const optionValueIds = product.options.map(
      (option) => newVariant.optionValueIds[option.id],
    );
    if (
      !newVariant.sku.trim() ||
      optionValueIds.length === 0 ||
      optionValueIds.some((value) => !value)
    ) {
      setError("Enter a unique SKU and select one value for every option.");
      return;
    }
    setBusy("variant-new");
    try {
      await adminApiFetch(`/admin/products/${product.id}/variants`, {
        method: "POST",
        body: {
          sku: newVariant.sku.trim(),
          barcode: emptyToNull(newVariant.barcode),
          priceOverride: newVariant.priceOverride
            ? Number(newVariant.priceOverride)
            : null,
          salePriceOverride: newVariant.salePriceOverride
            ? Number(newVariant.salePriceOverride)
            : null,
          lowStockThreshold: Number(newVariant.lowStockThreshold),
          weightGrams: newVariant.weightGrams
            ? Number(newVariant.weightGrams)
            : null,
          imageId: null,
          isActive: true,
          optionValueIds,
        },
      });
      setNewVariant({
        sku: "",
        barcode: "",
        priceOverride: "",
        salePriceOverride: "",
        lowStockThreshold: "5",
        weightGrams: "",
        optionValueIds: {},
      });
      setNotice(
        "Variant created with zero stock. Use its stock adjustment to restock it.",
      );
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const saveVariant = async (variant: ProductVariant) => {
    setBusy(variant.id);
    setError("");
    try {
      await adminApiFetch(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: {
          sku: variant.sku.trim(),
          barcode: emptyToNull(variant.barcode),
          priceOverride: variant.priceOverride
            ? Number(variant.priceOverride)
            : null,
          salePriceOverride: variant.salePriceOverride
            ? Number(variant.salePriceOverride)
            : null,
          saleStartsAt: variant.saleStartsAt
            ? new Date(variant.saleStartsAt).toISOString()
            : null,
          saleEndsAt: variant.saleEndsAt
            ? new Date(variant.saleEndsAt).toISOString()
            : null,
          lowStockThreshold: Number(variant.lowStockThreshold),
          weightGrams: variant.weightGrams ? Number(variant.weightGrams) : null,
          imageId: variant.imageId || null,
          isActive: variant.isActive,
          optionValueIds: variant.optionValues.map((entry) => entry.value.id),
        },
      });
      const adjustment = Number(stockAdjustments[variant.id] ?? 0);
      if (Number.isInteger(adjustment) && adjustment !== 0) {
        await adminApiFetch("/admin/inventory/adjust", {
          method: "POST",
          body: {
            variantId: variant.id,
            quantity: adjustment,
            type: "MANUAL_ADJUSTMENT",
            reason: "Stock changed in the product editor",
          },
        });
        setStockAdjustments((current) => ({ ...current, [variant.id]: "" }));
      }
      setNotice(`${variant.sku} saved.`);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  const duplicate = async () => {
    if (!product) return;
    setBusy("duplicate");
    try {
      await adminApiFetch(`/admin/products/${product.id}/duplicate`, {
        method: "POST",
      });
      onSaved("Draft copy created. Refresh the product list to edit it.");
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#edf0f6] text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-edit-title"
    >
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="product-edit-title"
              className="truncate text-lg font-semibold"
            >
              Edit {product?.name ?? "product"}
            </h2>
            <p className="hidden text-xs text-muted sm:block">
              Details, media, options, variants, stock, SEO and publishing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void duplicate()}
              disabled={!product || Boolean(busy)}
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm sm:flex"
            >
              <Copy size={16} /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => void saveBase()}
              disabled={!product || saving}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-xl"
              aria-label="Close product editor"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-24">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
            {sections.map(({ id, label: sectionLabel, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex min-h-14 items-center gap-3 rounded-xl p-2.5 text-left ${
                  section === id
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-background"
                }`}
              >
                <Icon size={18} />
                <span className="hidden text-sm font-semibold lg:block">
                  {sectionLabel}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {error && (
            <div className="mb-4 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              {notice}
            </div>
          )}
          {loading || !product ? (
            <div className="grid min-h-96 place-items-center rounded-2xl border border-line bg-white">
              <Loader2 className="animate-spin text-accent" />
            </div>
          ) : section === "details" ? (
            <div className="space-y-5">
              <Panel title="Identity and merchandising">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field title="Product name *" wide>
                    <input
                      className={input}
                      value={product.name}
                      maxLength={200}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </Field>
                  <Field title="URL slug *">
                    <input
                      className={input}
                      value={product.slug}
                      maxLength={191}
                      onChange={(e) =>
                        update(
                          "slug",
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                        )
                      }
                    />
                  </Field>
                  <Field title="Category *">
                    <select
                      className={input}
                      value={product.categoryId}
                      onChange={(e) => update("categoryId", e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {(
                    [
                      "skuPrefix",
                      "brand",
                      "productType",
                      "vendor",
                      "countryOfOrigin",
                      "hsCode",
                    ] as const
                  ).map((key) => (
                    <Field
                      key={key}
                      title={
                        {
                          skuPrefix: "SKU prefix",
                          brand: "Brand",
                          productType: "Product type",
                          vendor: "Vendor",
                          countryOfOrigin: "Country of origin",
                          hsCode: "HS / customs code",
                        }[key]
                      }
                    >
                      <input
                        className={input}
                        value={product[key] ?? ""}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              </Panel>
              <Panel title="Description and pricing">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field title="Short description" wide>
                    <textarea
                      className={`${input} min-h-24 py-3`}
                      maxLength={500}
                      value={product.shortDescription ?? ""}
                      onChange={(e) =>
                        update("shortDescription", e.target.value)
                      }
                    />
                  </Field>
                  <Field title="Full description *" wide>
                    <textarea
                      className={`${input} min-h-48 py-3`}
                      maxLength={100000}
                      value={product.description}
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </Field>
                  <Field title="Regular price (BDT) *">
                    <input
                      className={input}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={product.regularPrice}
                      onChange={(e) => update("regularPrice", e.target.value)}
                    />
                  </Field>
                  <Field title="Sale price (BDT)">
                    <input
                      className={input}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={product.salePrice ?? ""}
                      onChange={(e) =>
                        update("salePrice", e.target.value || null)
                      }
                    />
                  </Field>
                  <Field title="Sale starts">
                    <input
                      className={input}
                      type="datetime-local"
                      value={localDate(product.saleStartsAt)}
                      onChange={(e) =>
                        update("saleStartsAt", e.target.value || null)
                      }
                    />
                  </Field>
                  <Field title="Sale ends">
                    <input
                      className={input}
                      type="datetime-local"
                      value={localDate(product.saleEndsAt)}
                      onChange={(e) =>
                        update("saleEndsAt", e.target.value || null)
                      }
                    />
                  </Field>
                </div>
              </Panel>
              <Panel title="Custom specifications">
                <p className="mb-4 text-sm text-muted">
                  Add material, dimensions, compatibility, warranty,
                  ingredients, model, care instructions, or any other product
                  fact.
                </p>
                <div className="space-y-3">
                  {specifications.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                    >
                      <input
                        className={input}
                        placeholder="Specification"
                        value={item.name}
                        onChange={(e) =>
                          setSpecifications((all) =>
                            all.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, name: e.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                      <input
                        className={input}
                        placeholder="Value"
                        value={item.value}
                        onChange={(e) =>
                          setSpecifications((all) =>
                            all.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, value: e.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="grid h-11 w-11 place-items-center text-error"
                        onClick={() =>
                          setSpecifications((all) =>
                            all.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm"
                  onClick={() =>
                    setSpecifications((all) => [
                      ...all,
                      { id: crypto.randomUUID(), name: "", value: "" },
                    ])
                  }
                >
                  <Plus size={16} /> Add specification
                </button>
              </Panel>
            </div>
          ) : section === "media" ? (
            <Panel title="Product media">
              <div className="mb-5 rounded-xl border border-dashed border-line bg-background p-6 text-center">
                <ImagePlus className="mx-auto mb-2 text-accent" />
                <p className="text-sm font-medium">
                  Upload JPG, PNG, WebP or AVIF
                </p>
                <p className="mt-1 text-xs text-muted">
                  Up to 12 images. Choose a primary storefront image after
                  upload.
                </p>
                <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-surface">
                  {busy === "images" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}{" "}
                  Add images
                  <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={busy === "images"}
                    onChange={(e) => void uploadFiles(e.target.files)}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {product.images.map((image, index) => (
                  <article
                    key={image.id}
                    className="overflow-hidden rounded-xl border border-line bg-background"
                  >
                    <div className="aspect-[4/3] bg-white">
                      <img
                        src={image.url}
                        alt={image.altText ?? product.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="space-y-3 p-3">
                      <input
                        className={input}
                        defaultValue={image.altText ?? ""}
                        placeholder="Accessible alt text"
                        onBlur={(e) =>
                          void patchImage(image.id, {
                            altText: emptyToNull(e.target.value),
                          })
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={image.isPrimary || busy === image.id}
                          className="min-h-10 rounded-lg border border-line px-3 text-xs disabled:opacity-50"
                          onClick={() =>
                            void patchImage(image.id, {
                              isPrimary: true,
                              sortOrder: 0,
                            })
                          }
                        >
                          {image.isPrimary ? "Primary image" : "Make primary"}
                        </button>
                        <button
                          type="button"
                          disabled={index === 0 || busy === image.id}
                          className="min-h-10 rounded-lg border border-line px-3 text-xs disabled:opacity-50"
                          onClick={() =>
                            void patchImage(image.id, {
                              sortOrder: Math.max(0, image.sortOrder - 1),
                            })
                          }
                        >
                          Move earlier
                        </button>
                        <button
                          type="button"
                          className="grid h-10 w-10 place-items-center text-error"
                          onClick={() => void deleteImage(image.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          ) : section === "variants" ? (
            <div className="space-y-5">
              <Panel title="Product options">
                <p className="mb-5 text-sm text-muted">
                  Use any option system: size, colour, storage, flavour,
                  material, pack size, voltage, fit, edition, or custom values.
                </p>
                <div className="space-y-4">
                  {product.options.map((option) => (
                    <article
                      key={option.id}
                      className="rounded-xl border border-line p-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <input
                          className={input}
                          value={option.name}
                          onChange={(e) =>
                            setProduct((current) =>
                              current
                                ? {
                                    ...current,
                                    options: current.options.map((item) =>
                                      item.id === option.id
                                        ? { ...item, name: e.target.value }
                                        : item,
                                    ),
                                  }
                                : null,
                            )
                          }
                        />
                        <button
                          type="button"
                          disabled={busy === option.id}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent px-4 text-sm text-accent"
                          onClick={() => void saveOption(option)}
                        >
                          {busy === option.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Check size={15} />
                          )}{" "}
                          Save option
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {option.values.map((value) => (
                          <div key={value.id} className="flex gap-2">
                            <input
                              className={input}
                              value={value.value}
                              onChange={(e) =>
                                setProduct((current) =>
                                  current
                                    ? {
                                        ...current,
                                        options: current.options.map((item) =>
                                          item.id === option.id
                                            ? {
                                                ...item,
                                                values: item.values.map(
                                                  (entry) =>
                                                    entry.id === value.id
                                                      ? {
                                                          ...entry,
                                                          value: e.target.value,
                                                        }
                                                      : entry,
                                                ),
                                              }
                                            : item,
                                        ),
                                      }
                                    : null,
                                )
                              }
                            />
                            {(option.name.toLowerCase() === "color" ||
                              option.name.toLowerCase() === "colour") && (
                              <input
                                aria-label={`Colour for ${value.value}`}
                                type="color"
                                className="h-11 w-12 rounded border border-line"
                                value={value.metadata?.hex ?? "#000000"}
                                onChange={(e) =>
                                  setProduct((current) =>
                                    current
                                      ? {
                                          ...current,
                                          options: current.options.map(
                                            (item) =>
                                              item.id === option.id
                                                ? {
                                                    ...item,
                                                    values: item.values.map(
                                                      (entry) =>
                                                        entry.id === value.id
                                                          ? {
                                                              ...entry,
                                                              metadata: {
                                                                ...entry.metadata,
                                                                hex: e.target
                                                                  .value,
                                                              },
                                                            }
                                                          : entry,
                                                    ),
                                                  }
                                                : item,
                                          ),
                                        }
                                      : null,
                                  )
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          className={input}
                          placeholder={`Add another ${option.name} value`}
                          value={newValues[option.id] ?? ""}
                          onChange={(event) =>
                            setNewValues((current) => ({
                              ...current,
                              [option.id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="min-h-11 shrink-0 rounded-xl border border-line px-4 text-sm"
                          onClick={() => void addOptionValue(option)}
                        >
                          Add value
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-[1fr_2fr_auto]">
                  <input
                    className={input}
                    placeholder="New option (e.g. Size)"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="Values separated by commas (S, M, L)"
                    value={newOptionValues}
                    onChange={(e) => setNewOptionValues(e.target.value)}
                  />
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm text-surface"
                    onClick={() => void addOption()}
                  >
                    <Plus size={16} /> Add option
                  </button>
                </div>
              </Panel>
              <Panel title="Variants and inventory">
                <p className="mb-5 text-sm text-muted">
                  Edit SKU, barcode, pricing, image, weight, availability,
                  low-stock alerts, and make audited stock adjustments.
                </p>
                <div className="space-y-4">
                  {product.variants.map((variant) => (
                    <article
                      key={variant.id}
                      className="rounded-xl border border-line p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">
                          {variant.optionValues
                            .map(
                              (entry) =>
                                `${entry.value.option.name}: ${entry.value.value}`,
                            )
                            .join(" / ") || "Default variant"}
                        </p>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(e) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              isActive: e.target.checked,
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          />{" "}
                          Available for sale
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {(
                          [
                            "sku",
                            "barcode",
                            "priceOverride",
                            "salePriceOverride",
                          ] as const
                        ).map((key) => (
                          <Field
                            key={key}
                            title={
                              {
                                sku: "SKU *",
                                barcode: "Barcode / GTIN",
                                priceOverride: "Price override",
                                salePriceOverride: "Sale override",
                              }[key]
                            }
                          >
                            <input
                              className={input}
                              type={key.includes("Price") ? "number" : "text"}
                              value={variant[key] ?? ""}
                              onChange={(e) =>
                                setProduct((current) =>
                                  current
                                    ? {
                                        ...current,
                                        variants: current.variants.map(
                                          (item) =>
                                            item.id === variant.id
                                              ? {
                                                  ...item,
                                                  [key]: e.target.value || null,
                                                }
                                              : item,
                                        ),
                                      }
                                    : null,
                                )
                              }
                            />
                          </Field>
                        ))}
                        <Field title="Current stock">
                          <input
                            className={`${input} bg-background`}
                            readOnly
                            value={variant.stock}
                          />
                        </Field>
                        <Field title="Adjust stock (+ / -)">
                          <input
                            className={input}
                            type="number"
                            step="1"
                            value={stockAdjustments[variant.id] ?? ""}
                            onChange={(e) =>
                              setStockAdjustments((current) => ({
                                ...current,
                                [variant.id]: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field title="Low-stock alert">
                          <input
                            className={input}
                            type="number"
                            min="0"
                            step="1"
                            value={variant.lowStockThreshold}
                            onChange={(e) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              lowStockThreshold: Number(
                                                e.target.value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          />
                        </Field>
                        <Field title="Weight (grams)">
                          <input
                            className={input}
                            type="number"
                            min="1"
                            step="1"
                            value={variant.weightGrams ?? ""}
                            onChange={(e) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              weightGrams: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          />
                        </Field>
                        <Field title="Variant image">
                          <select
                            className={input}
                            value={variant.imageId ?? ""}
                            onChange={(e) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              imageId: e.target.value || null,
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          >
                            <option value="">Use primary image</option>
                            {product.images.map((image, imageIndex) => (
                              <option key={image.id} value={image.id}>
                                Image {imageIndex + 1}:{" "}
                                {image.altText ?? product.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field title="Variant sale starts">
                          <input
                            className={input}
                            type="datetime-local"
                            value={localDate(variant.saleStartsAt)}
                            onChange={(event) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              saleStartsAt:
                                                event.target.value || null,
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          />
                        </Field>
                        <Field title="Variant sale ends">
                          <input
                            className={input}
                            type="datetime-local"
                            value={localDate(variant.saleEndsAt)}
                            onChange={(event) =>
                              setProduct((current) =>
                                current
                                  ? {
                                      ...current,
                                      variants: current.variants.map((item) =>
                                        item.id === variant.id
                                          ? {
                                              ...item,
                                              saleEndsAt:
                                                event.target.value || null,
                                            }
                                          : item,
                                      ),
                                    }
                                  : null,
                              )
                            }
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        disabled={busy === variant.id}
                        className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-surface"
                        onClick={() => void saveVariant(variant)}
                      >
                        {busy === variant.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}{" "}
                        Save variant & stock
                      </button>
                    </article>
                  ))}
                </div>
                {product.options.length > 0 && (
                  <div className="mt-6 rounded-xl border border-dashed border-line bg-background p-4">
                    <h4 className="font-semibold">Create another variant</h4>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {product.options.map((option) => (
                        <Field key={option.id} title={option.name}>
                          <select
                            className={input}
                            value={newVariant.optionValueIds[option.id] ?? ""}
                            onChange={(event) =>
                              setNewVariant((current) => ({
                                ...current,
                                optionValueIds: {
                                  ...current.optionValueIds,
                                  [option.id]: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">Select {option.name}</option>
                            {option.values.map((value) => (
                              <option key={value.id} value={value.id}>
                                {value.value}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ))}
                      {(
                        [
                          ["sku", "SKU *"],
                          ["barcode", "Barcode / GTIN"],
                          ["priceOverride", "Price override"],
                          ["salePriceOverride", "Sale override"],
                          ["lowStockThreshold", "Low-stock alert"],
                          ["weightGrams", "Weight (grams)"],
                        ] as const
                      ).map(([key, title]) => (
                        <Field key={key} title={title}>
                          <input
                            className={input}
                            type={
                              key === "sku" || key === "barcode"
                                ? "text"
                                : "number"
                            }
                            value={newVariant[key]}
                            onChange={(event) =>
                              setNewVariant((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                          />
                        </Field>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={busy === "variant-new"}
                      className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white"
                      onClick={() => void createVariant()}
                    >
                      {busy === "variant-new" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Create variant
                    </button>
                  </div>
                )}
              </Panel>
            </div>
          ) : (
            <div className="space-y-5">
              <Panel title="Search and social preview">
                <div className="grid gap-5">
                  <Field title="SEO title">
                    <input
                      className={input}
                      maxLength={160}
                      value={product.seoTitle ?? ""}
                      onChange={(e) => update("seoTitle", e.target.value)}
                    />
                  </Field>
                  <Field title="SEO description">
                    <textarea
                      className={`${input} min-h-28 py-3`}
                      maxLength={320}
                      value={product.seoDescription ?? ""}
                      onChange={(e) => update("seoDescription", e.target.value)}
                    />
                  </Field>
                  <Field title="Search tags">
                    <input
                      className={input}
                      value={product.tags.join(", ")}
                      onChange={(e) =>
                        update(
                          "tags",
                          e.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean)
                            .slice(0, 30),
                        )
                      }
                      placeholder="wireless, audio, gift"
                    />
                  </Field>
                </div>
                <div className="mt-5 rounded-xl border border-line bg-background p-4">
                  <p className="text-sm text-blue-700">
                    {product.seoTitle || product.name}
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    swoosh.shop/product/{product.slug}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {product.seoDescription ||
                      product.shortDescription ||
                      "Add an SEO description to control this search preview."}
                  </p>
                </div>
              </Panel>
              <Panel title="Storefront and publishing">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field title="Publication status">
                    <select
                      className={input}
                      value={product.status}
                      onChange={(e) =>
                        update(
                          "status",
                          e.target.value as ProductDetail["status"],
                        )
                      }
                    >
                      <option value="DRAFT">
                        Draft — hidden from customers
                      </option>
                      <option value="ACTIVE">
                        Active — visible when in stock
                      </option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </Field>
                  <div className="space-y-3">
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 text-sm">
                      <input
                        type="checkbox"
                        checked={product.isNewArrival}
                        onChange={(e) =>
                          update("isNewArrival", e.target.checked)
                        }
                      />{" "}
                      Show in New Arrivals
                    </label>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 text-sm">
                      <input
                        type="checkbox"
                        checked={product.isFeatured}
                        onChange={(e) => update("isFeatured", e.target.checked)}
                      />{" "}
                      Show in Crafted for You / Featured
                    </label>
                  </div>
                </div>
                <div className="mt-6">
                  <p className={label}>Collections</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((collection) => (
                      <label
                        key={collection.id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={collectionIds.includes(collection.id)}
                          onChange={(e) =>
                            setCollectionIds((current) =>
                              e.target.checked
                                ? [...current, collection.id]
                                : current.filter((id) => id !== collection.id),
                            )
                          }
                        />
                        {collection.name}
                      </label>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h3 className="mb-5 text-xl font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className={label}>{title}</span>
      {children}
    </label>
  );
}
