import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileSearch,
  ImagePlus,
  Loader2,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
}

export interface Collection {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  collections: Collection[];
  onClose: () => void;
  onCreated: (message: string, warning?: boolean) => void;
}

interface UploadSignature {
  provider: "cloudinary" | "s3";
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  fields?: Record<string, string | number | boolean>;
}

interface ImageDraft {
  id: string;
  file: File;
  preview: string;
}

interface OptionValueDraft {
  id: string;
  value: string;
  hex: string;
}

interface OptionDraft {
  id: string;
  name: string;
  values: OptionValueDraft[];
}

interface VariantDraft {
  id: string;
  optionValues: Record<string, string>;
  sku: string;
  barcode: string;
  priceOverride: string;
  salePriceOverride: string;
  stock: string;
  lowStock: string;
  weightGrams: string;
  isActive: boolean;
}

interface SpecificationDraft {
  id: string;
  name: string;
  value: string;
}

type Section = "details" | "media" | "variants" | "seo";

const sectionOrder: Section[] = ["details", "media", "variants", "seo"];
const sectionMeta: Record<
  Section,
  { label: string; description: string; icon: typeof Box }
> = {
  details: {
    label: "Product details",
    description: "Identity, pricing and merchandising",
    icon: PackagePlus,
  },
  media: {
    label: "Media gallery",
    description: "Multiple product images and primary image",
    icon: ImagePlus,
  },
  variants: {
    label: "Options & variants",
    description: "Any option combination, SKU and inventory",
    icon: Box,
  },
  seo: {
    label: "SEO & publishing",
    description: "Search preview and publication controls",
    icon: FileSearch,
  },
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const skuPart = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

const newId = () => crypto.randomUUID();

const emptyVariant = (
  optionValues: Record<string, string> = {},
  prefix = "PRODUCT",
): VariantDraft => ({
  id: newId(),
  optionValues,
  sku: [prefix, ...Object.values(optionValues).map(skuPart)]
    .filter(Boolean)
    .join("-")
    .slice(0, 100),
  barcode: "",
  priceOverride: "",
  salePriceOverride: "",
  stock: "0",
  lowStock: "5",
  weightGrams: "",
  isActive: true,
});

const fieldLabels: Record<string, string> = {
  name: "Product name",
  slug: "URL slug",
  categoryId: "Category",
  description: "Description",
  regularPrice: "Regular price",
  salePrice: "Sale price",
  options: "Options",
  variants: "Variants",
  sku: "SKU",
  barcode: "Barcode",
  optionValues: "Variant options",
};

const messageFor = (error: unknown) => {
  if (error instanceof ApiError) {
    const details = Object.entries(error.fields ?? {})
      .flatMap(([field, messages]) => {
        const root = field.split(".").at(-1) ?? field;
        return messages.map(
          (message) => `${fieldLabels[root] ?? field}: ${message}`,
        );
      })
      .join(" ");
    return details ? `${error.message}. ${details}` : error.message;
  }
  return error instanceof Error
    ? error.message
    : "Unable to create the product.";
};

function cartesian(options: OptionDraft[]) {
  return options.reduce<Record<string, string>[]>(
    (combinations, option) =>
      combinations.flatMap((combination) =>
        option.values
          .filter((item) => item.value.trim())
          .map((item) => ({
            ...combination,
            [option.name.trim()]: item.value.trim(),
          })),
      ),
    [{}],
  );
}

export default function ProductCreateModal({
  categories,
  collections,
  onClose,
  onCreated,
}: Props) {
  const [section, setSection] = useState<Section>("details");
  const [localCategories, setLocalCategories] = useState(categories);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryId: categories[0]?.id ?? "",
    skuPrefix: "",
    brand: "",
    productType: "",
    vendor: "",
    countryOfOrigin: "",
    hsCode: "",
    shortDescription: "",
    description: "",
    regularPrice: "",
    salePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    status: "ACTIVE" as "DRAFT" | "ACTIVE",
    tags: "",
    collectionIds: [] as string[],
    isFeatured: false,
    isNewArrival: false,
    seoTitle: "",
    seoDescription: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const previewUrls = useRef(new Set<string>());
  const [primaryImageId, setPrimaryImageId] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([
    emptyVariant({}, "PRODUCT"),
  ]);
  const [specifications, setSpecifications] = useState<
    SpecificationDraft[]
  >([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const activeIndex = sectionOrder.indexOf(section);
  const validOptions = options
    .map((option) => ({
      ...option,
      name: option.name.trim(),
      values: option.values.filter((item) => item.value.trim()),
    }))
    .filter((option) => option.name && option.values.length);

  const variantCount = useMemo(
    () =>
      validOptions.length
        ? validOptions.reduce(
            (count, option) => count * option.values.length,
            1,
          )
        : 1,
    [validOptions],
  );

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      ),
    );
    if (accepted.some((file) => file.size > 10 * 1024 * 1024)) {
      setError("Every image must be 10 MB or smaller.");
      return;
    }
    const remaining = Math.max(0, 12 - images.length);
    const next = accepted.slice(0, remaining).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: newId(), file, preview };
    });
    setImages((current) => [...current, ...next]);
    if (!primaryImageId && next[0]) setPrimaryImageId(next[0].id);
    if (accepted.length > remaining)
      setError("A product can have up to 12 images.");
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
        previewUrls.current.delete(target.preview);
      }
      const next = current.filter((image) => image.id !== id);
      if (primaryImageId === id) setPrimaryImageId(next[0]?.id ?? "");
      return next;
    });
  };

  const addPresetOption = (name = "", values = [""]) => {
    if (
      name &&
      options.some(
        (option) => option.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError(`${name} option has already been added.`);
      return;
    }
    setError("");
    setOptions((current) => [
      ...current,
      {
        id: newId(),
        name,
        values: values.map((value) => ({
          id: newId(),
          value,
          hex: "#1a1a1a",
        })),
      },
    ]);
  };

  const updateOption = (
    optionId: string,
    updater: (option: OptionDraft) => OptionDraft,
  ) =>
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? updater(option) : option,
      ),
    );

  const generateVariants = () => {
    setError("");
    if (validOptions.length !== options.length) {
      setError("Give every option a name and at least one value.");
      return;
    }
    if (variantCount > 500) {
      setError(
        `This creates ${variantCount} variants. Reduce it to 500 or fewer.`,
      );
      return;
    }
    const existing = new Map(
      variants.map((variant) => [
        JSON.stringify(variant.optionValues),
        variant,
      ]),
    );
    const prefix =
      skuPart(form.skuPrefix) || skuPart(form.slug) || "PRODUCT";
    const combinations = validOptions.length ? cartesian(validOptions) : [{}];
    setVariants(
      combinations.map((values) => {
        const previous = existing.get(JSON.stringify(values));
        return previous
          ? { ...previous, optionValues: values }
          : emptyVariant(values, prefix);
      }),
    );
  };

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCreatingCategory(true);
    setError("");
    try {
      const category = await adminApiFetch<Category>("/admin/categories", {
        method: "POST",
        body: {
          name,
          slug: slugify(name),
          description: null,
          imageUrl: null,
          parentId: null,
          sortOrder: localCategories.length,
          isActive: true,
          seoTitle: null,
          seoDescription: null,
        },
      });
      setLocalCategories((current) => [...current, category]);
      update("categoryId", category.id);
      setNewCategory("");
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setCreatingCategory(false);
    }
  };

  const uploadImage = async (
    productId: string,
    image: ImageDraft,
    sortOrder: number,
  ) => {
    const signature = await adminApiFetch<UploadSignature>(
      "/admin/uploads/presign",
      {
        method: "POST",
        body: {
          mimeType: image.file.type,
          fileSize: image.file.size,
          purpose: "product",
        },
      },
    );
    let url = signature.publicUrl;
    let objectKey = signature.objectKey;
    let dimensions: { width?: number; height?: number } = {};
    if (signature.provider === "cloudinary") {
      const body = new FormData();
      body.append("file", image.file);
      Object.entries(signature.fields ?? {}).forEach(([key, value]) =>
        body.append(key, String(value)),
      );
      const response = await fetch(signature.uploadUrl, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        let detail = "";
        try {
          const failure = (await response.json()) as {
            error?: { message?: string };
          };
          detail = failure.error?.message?.trim() ?? "";
        } catch {
          // The provider did not return a structured error.
        }
        throw new Error(
          detail
            ? `Cloudinary rejected the image: ${detail}`
            : "Cloudinary rejected the image. Check its credentials in Render.",
        );
      }
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
        headers: { "Content-Type": image.file.type },
        body: image.file,
      });
      if (!response.ok) throw new Error("Object storage rejected an image.");
    }
    if (!url) throw new Error("The upload provider returned no public URL.");
    await adminApiFetch(`/admin/products/${productId}/images`, {
      method: "POST",
      body: {
        url,
        objectKey,
        altText: form.name.trim(),
        mimeType: image.file.type,
        ...dimensions,
        sortOrder,
        isPrimary: image.id === primaryImageId,
      },
    });
  };

  const validate = () => {
    const regularPrice = Number(form.regularPrice);
    const salePrice = form.salePrice ? Number(form.salePrice) : null;
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (form.name.trim().length < 2) return "Enter a product name.";
    if (!form.slug.trim()) return "Enter a valid URL slug.";
    if (!form.categoryId) return "Select or create a category.";
    if (!form.description.trim()) return "Enter a product description.";
    if (!Number.isFinite(regularPrice) || regularPrice <= 0)
      return "Regular price must be greater than zero.";
    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) ||
        salePrice <= 0 ||
        salePrice >= regularPrice)
    )
      return "Sale price must be positive and lower than regular price.";
    if (form.saleStartsAt && form.saleEndsAt) {
      if (new Date(form.saleStartsAt) >= new Date(form.saleEndsAt))
        return "Sale end must be later than sale start.";
    }
    if (tags.length > 30 || tags.some((tag) => tag.length > 50))
      return "Use up to 30 tags, each 50 characters or shorter.";
    const completedSpecifications = specifications.filter(
      (item) => item.name.trim() || item.value.trim(),
    );
    if (
      completedSpecifications.some(
        (item) => !item.name.trim() || !item.value.trim(),
      )
    )
      return "Every custom specification needs both a name and value.";
    if (
      new Set(
        completedSpecifications.map((item) => item.name.trim().toLowerCase()),
      ).size !== completedSpecifications.length
    )
      return "Custom specification names must be unique.";
    if (validOptions.length !== options.length)
      return "Complete or remove every unfinished option.";
    if (!variants.length) return "Generate at least one variant.";
    if (
      variants.some(
        (variant) =>
          Object.keys(variant.optionValues).length !== validOptions.length ||
          validOptions.some(
            (option) =>
              !option.values.some(
                (value) =>
                  value.value.trim().toLowerCase() ===
                  variant.optionValues[option.name]?.toLowerCase(),
              ),
          ),
      )
    )
      return "Options changed. Generate variants again.";
    const skus = variants.map((variant) => variant.sku.trim().toLowerCase());
    if (skus.some((sku) => !sku)) return "Every variant needs a SKU.";
    if (new Set(skus).size !== skus.length)
      return "Every variant SKU must be unique.";
    for (const variant of variants) {
      const stock = Number(variant.stock);
      const lowStock = Number(variant.lowStock);
      const price = variant.priceOverride
        ? Number(variant.priceOverride)
        : null;
      const variantSale = variant.salePriceOverride
        ? Number(variant.salePriceOverride)
        : null;
      if (!Number.isInteger(stock) || stock < 0)
        return `Stock for ${variant.sku} must be a whole number of zero or more.`;
      if (!Number.isInteger(lowStock) || lowStock < 0)
        return `Low-stock threshold for ${variant.sku} is invalid.`;
      if (price !== null && (!Number.isFinite(price) || price <= 0))
        return `Price override for ${variant.sku} is invalid.`;
      if (
        variantSale !== null &&
        (!Number.isFinite(variantSale) ||
          variantSale <= 0 ||
          (price !== null && variantSale >= price))
      )
        return `Sale price for ${variant.sku} is invalid.`;
      if (
        variant.weightGrams &&
        (!Number.isInteger(Number(variant.weightGrams)) ||
          Number(variant.weightGrams) <= 0)
      )
        return `Weight for ${variant.sku} must be a positive whole number.`;
    }
    return "";
  };

  const submit = async () => {
    if (saving) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    setProgress(
      images.length
        ? "Checking product media storage…"
        : "Creating product, options and inventory…",
    );
    const numberOrNull = (value: string) =>
      value ? Number(value) : null;
    try {
      if (images[0]) {
        await adminApiFetch<UploadSignature>("/admin/uploads/presign", {
          method: "POST",
          body: {
            mimeType: images[0].file.type,
            fileSize: images[0].file.size,
            purpose: "product",
          },
        });
        setProgress("Creating product, options and inventory…");
      }
      const created = await adminApiFetch<{ id: string }>(
        "/admin/products/full",
        {
          method: "POST",
          body: {
            product: {
              name: form.name.trim(),
              slug: form.slug.trim(),
              categoryId: form.categoryId,
              skuPrefix: form.skuPrefix.trim() || null,
              brand: form.brand.trim() || null,
              productType: form.productType.trim() || null,
              vendor: form.vendor.trim() || null,
              countryOfOrigin: form.countryOfOrigin.trim() || null,
              hsCode: form.hsCode.trim() || null,
              attributes: Object.fromEntries(
                specifications
                  .filter((item) => item.name.trim() && item.value.trim())
                  .map((item) => [item.name.trim(), item.value.trim()]),
              ),
              shortDescription: form.shortDescription.trim() || null,
              description: form.description.trim(),
              regularPrice: Number(form.regularPrice),
              salePrice: numberOrNull(form.salePrice),
              saleStartsAt: form.saleStartsAt
                ? new Date(form.saleStartsAt).toISOString()
                : null,
              saleEndsAt: form.saleEndsAt
                ? new Date(form.saleEndsAt).toISOString()
                : null,
              status: form.status,
              isFeatured: form.isFeatured,
              isNewArrival: form.isNewArrival,
              tags: form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              seoTitle: form.seoTitle.trim() || null,
              seoDescription: form.seoDescription.trim() || null,
              collectionIds: form.collectionIds,
            },
            options: validOptions.map((option) => ({
              name: option.name,
              values: option.values.map((item) => ({
                value: item.value.trim(),
                ...(option.name.toLowerCase() === "color" ||
                option.name.toLowerCase() === "colour"
                  ? { metadata: { hex: item.hex } }
                  : {}),
              })),
            })),
            variants: variants.map((variant) => ({
              sku: variant.sku.trim(),
              barcode: variant.barcode.trim() || null,
              priceOverride: numberOrNull(variant.priceOverride),
              salePriceOverride: numberOrNull(variant.salePriceOverride),
              initialStock: Number(variant.stock),
              lowStockThreshold: Number(variant.lowStock),
              weightGrams: numberOrNull(variant.weightGrams),
              isActive: variant.isActive,
              optionValues: variant.optionValues,
            })),
          },
        },
      );

      const imageErrors: string[] = [];
      for (const [index, image] of images.entries()) {
        setProgress(`Uploading image ${index + 1} of ${images.length}…`);
        try {
          await uploadImage(created.id, image, index);
        } catch (caught) {
          imageErrors.push(messageFor(caught));
        }
      }
      if (imageErrors.length) {
        onCreated(
          `Product and inventory created, but ${imageErrors.length} image${imageErrors.length === 1 ? "" : "s"} failed: ${[...new Set(imageErrors)].join(" ")} Open Edit → Media gallery to retry.`,
          true,
        );
      } else {
        onCreated(
          `Product created with ${variants.length} variant${variants.length === 1 ? "" : "s"} and ${images.length} image${images.length === 1 ? "" : "s"}.`,
        );
      }
    } catch (caught) {
      setError(messageFor(caught));
      setProgress("");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#edf0f6] text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-create-title"
    >
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="product-create-title"
              className="truncate text-lg font-semibold sm:text-xl"
            >
              Add product
            </h2>
            <p className="hidden text-xs text-muted sm:block">
              Build products with flexible media, options, variants and stock
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="hidden min-h-11 rounded-xl border border-line px-4 text-sm font-medium sm:block"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white disabled:opacity-60 sm:min-w-36 sm:px-5"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}
              {saving ? "Creating…" : "Create product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="grid h-11 w-11 place-items-center rounded-xl sm:hidden"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-24">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
            {sectionOrder.map((item, index) => {
              const meta = sectionMeta[item];
              const Icon = meta.icon;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSection(item)}
                  className={`flex min-h-14 items-center gap-3 rounded-xl p-2.5 text-left transition lg:min-h-16 ${
                    section === item
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted hover:bg-background hover:text-ink"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-current/10">
                    <Icon size={17} />
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    <span className="block text-sm font-semibold">
                      {index + 1}. {meta.label}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        section === item ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {meta.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 hidden rounded-xl bg-background p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-accent" /> Product summary
            </div>
            <dl className="mt-3 space-y-2 text-xs text-muted">
              <div className="flex justify-between gap-3">
                <dt>Images</dt>
                <dd className="font-medium text-ink">{images.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Options</dt>
                <dd className="font-medium text-ink">{validOptions.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Variants</dt>
                <dd className="font-medium text-ink">{variants.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Status</dt>
                <dd className="font-medium text-ink">{form.status}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <main className="min-w-0">
          {error && (
            <div
              className="mb-5 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}
          {progress && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
              <Loader2 size={16} className="animate-spin" /> {progress}
            </div>
          )}

          {section === "details" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">Product information</h3>
                  <p className="mt-1 text-sm text-muted">
                    Works for clothing, electronics, groceries, furniture,
                    cosmetics, books and other physical retail products.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={labelClass}>Product name *</span>
                    <input
                      value={form.name}
                      maxLength={200}
                      onChange={(event) => {
                        update("name", event.target.value);
                        if (!slugEdited) {
                          update("slug", slugify(event.target.value));
                          if (!form.skuPrefix) {
                            const prefix = skuPart(event.target.value);
                            update("skuPrefix", prefix);
                            if (
                              options.length === 0 &&
                              variants.length === 1 &&
                              variants[0].sku === "PRODUCT"
                            ) {
                              setVariants([
                                { ...variants[0], sku: prefix || "PRODUCT" },
                              ]);
                            }
                          }
                        }
                      }}
                      className={inputClass}
                      placeholder="Example: Wireless Headphones Pro"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>URL slug *</span>
                    <input
                      value={form.slug}
                      maxLength={191}
                      onChange={(event) => {
                        setSlugEdited(true);
                        update("slug", slugify(event.target.value));
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>SKU prefix</span>
                    <input
                      value={form.skuPrefix}
                      maxLength={60}
                      onChange={(event) => {
                        const prefix = skuPart(event.target.value);
                        update("skuPrefix", prefix);
                        if (options.length === 0 && variants.length === 1) {
                          setVariants((current) => [
                            { ...current[0], sku: prefix || "PRODUCT" },
                          ]);
                        }
                      }}
                      className={inputClass}
                      placeholder="HEADPHONE"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Brand</span>
                    <input
                      value={form.brand}
                      maxLength={160}
                      onChange={(event) => update("brand", event.target.value)}
                      className={inputClass}
                      placeholder="Manufacturer or consumer brand"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Product type</span>
                    <input
                      value={form.productType}
                      maxLength={160}
                      onChange={(event) =>
                        update("productType", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Headphones, T-shirt, Coffee, Book…"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Vendor / supplier</span>
                    <input
                      value={form.vendor}
                      maxLength={160}
                      onChange={(event) => update("vendor", event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Country of origin</span>
                    <input
                      value={form.countryOfOrigin}
                      maxLength={120}
                      onChange={(event) =>
                        update("countryOfOrigin", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Bangladesh"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>HS / customs code</span>
                    <input
                      value={form.hsCode}
                      maxLength={32}
                      onChange={(event) => update("hsCode", event.target.value)}
                      className={inputClass}
                      placeholder="Optional international tariff code"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <span className={labelClass}>Category *</span>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <select
                        value={form.categoryId}
                        onChange={(event) =>
                          update("categoryId", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select category</option>
                        {localCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={newCategory}
                        onChange={(event) =>
                          setNewCategory(event.target.value)
                        }
                        className={inputClass}
                        placeholder="Or create a new category"
                      />
                      <button
                        type="button"
                        disabled={creatingCategory || !newCategory.trim()}
                        onClick={() => void createCategory()}
                        className="min-h-11 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-50"
                      >
                        {creatingCategory ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </div>
                  <label className="sm:col-span-2">
                    <span className={labelClass}>Short description</span>
                    <input
                      value={form.shortDescription}
                      maxLength={500}
                      onChange={(event) =>
                        update("shortDescription", event.target.value)
                      }
                      className={inputClass}
                      placeholder="One-line benefit shown in product cards"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelClass}>Full description *</span>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                      rows={9}
                      className={`${inputClass} py-3`}
                      placeholder="Describe features, materials, compatibility, care, warranty, contents and anything buyers need to know."
                    />
                    <span className="mt-1 block text-xs text-muted">
                      Safe basic HTML such as paragraphs, lists, headings,
                      emphasis and links is supported.
                    </span>
                  </label>
                </div>

                <div className="mt-7 border-t border-line pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">Custom specifications</h4>
                      <p className="mt-1 text-sm text-muted">
                        Add any facts buyers need: model, ingredients,
                        compatibility, dimensions, warranty, ISBN, capacity,
                        certification and more.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={specifications.length >= 100}
                      onClick={() =>
                        setSpecifications((current) => [
                          ...current,
                          { id: newId(), name: "", value: "" },
                        ])
                      }
                      className="flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium disabled:opacity-50"
                    >
                      <Plus size={15} /> Add specification
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {specifications.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_44px]"
                      >
                        <input
                          value={item.name}
                          maxLength={80}
                          onChange={(event) =>
                            setSpecifications((current) =>
                              current.map((specification) =>
                                specification.id === item.id
                                  ? {
                                      ...specification,
                                      name: event.target.value,
                                    }
                                  : specification,
                              ),
                            )
                          }
                          className={inputClass}
                          placeholder="Specification name"
                        />
                        <input
                          value={item.value}
                          maxLength={500}
                          onChange={(event) =>
                            setSpecifications((current) =>
                              current.map((specification) =>
                                specification.id === item.id
                                  ? {
                                      ...specification,
                                      value: event.target.value,
                                    }
                                  : specification,
                              ),
                            )
                          }
                          className={inputClass}
                          placeholder="Specification value"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSpecifications((current) =>
                              current.filter(
                                (specification) =>
                                  specification.id !== item.id,
                              ),
                            )
                          }
                          className="grid h-11 w-11 place-items-center rounded-xl text-error hover:bg-red-50"
                          aria-label="Remove specification"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <CircleDollarSign className="text-accent" size={21} />
                  <div>
                    <h3 className="font-semibold">Base pricing</h3>
                    <p className="text-sm text-muted">
                      Variants can override these prices later.
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className={labelClass}>Regular price (BDT) *</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.regularPrice}
                      onChange={(event) =>
                        update("regularPrice", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Sale price</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.salePrice}
                      onChange={(event) =>
                        update("salePrice", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Sale starts</span>
                    <input
                      type="datetime-local"
                      value={form.saleStartsAt}
                      onChange={(event) =>
                        update("saleStartsAt", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Sale ends</span>
                    <input
                      type="datetime-local"
                      value={form.saleEndsAt}
                      onChange={(event) =>
                        update("saleEndsAt", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <h3 className="font-semibold">Collections and discovery</h3>
                <p className="mt-1 text-sm text-muted">
                  Place the product in campaigns and add search keywords.
                </p>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <label>
                    <span className={labelClass}>Search tags</span>
                    <input
                      value={form.tags}
                      onChange={(event) => update("tags", event.target.value)}
                      className={inputClass}
                      placeholder="wireless, audio, travel, gift"
                    />
                    <span className="mt-1 block text-xs text-muted">
                      Separate tags with commas.
                    </span>
                  </label>
                  <div>
                    <span className={labelClass}>Collections</span>
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
                      {collections.length ? (
                        collections.map((collection) => (
                          <label
                            key={collection.id}
                            className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm hover:bg-background"
                          >
                            <input
                              type="checkbox"
                              checked={form.collectionIds.includes(
                                collection.id,
                              )}
                              onChange={(event) =>
                                update(
                                  "collectionIds",
                                  event.target.checked
                                    ? [
                                        ...form.collectionIds,
                                        collection.id,
                                      ]
                                    : form.collectionIds.filter(
                                        (id) => id !== collection.id,
                                      ),
                                )
                              }
                              className="accent-accent"
                            />
                            {collection.name}
                          </label>
                        ))
                      ) : (
                        <p className="p-2 text-sm text-muted">
                          No collections created yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === "media" && (
            <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
              <div className="mb-6">
                <h3 className="text-xl font-semibold">Product media</h3>
                <p className="mt-1 text-sm text-muted">
                  Add up to 12 JPG, PNG, WebP or AVIF images. Select one as the
                  primary storefront image.
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.5fr)]">
                <div className="relative grid min-h-[420px] place-items-center overflow-hidden rounded-2xl bg-background">
                  {images.length ? (
                    <img
                      src={
                        images.find((image) => image.id === primaryImageId)
                          ?.preview ?? images[0].preview
                      }
                      alt="Primary product preview"
                      className="h-full max-h-[650px] w-full object-contain"
                    />
                  ) : (
                    <div className="px-6 text-center text-muted">
                      <ImagePlus className="mx-auto mb-3" size={38} />
                      <p className="font-medium text-ink">No images yet</p>
                      <p className="mt-1 text-sm">
                        Upload clear front, side, detail and packaging photos.
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 content-start gap-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 ${
                        image.id === primaryImageId
                          ? "border-accent"
                          : "border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setPrimaryImageId(image.id)}
                        className="h-full w-full"
                        aria-label="Make primary image"
                      >
                        <img
                          src={image.preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {image.id === primaryImageId && (
                        <span className="absolute bottom-1 left-1 rounded bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-white">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-error opacity-100 shadow sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {images.length < 12 && (
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line bg-background text-center text-muted transition hover:border-accent hover:text-accent">
                      <span>
                        <Plus className="mx-auto" size={25} />
                        <span className="mt-1 block text-xs">Add images</span>
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        onChange={(event) => addImages(event.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </section>
          )}

          {section === "variants" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Product options</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted">
                      Use any option name: size, colour, material, storage,
                      voltage, flavour, pack size, style, condition or another
                      attribute.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addPresetOption("Size", [
                          "XS",
                          "S",
                          "M",
                          "L",
                          "XL",
                          "XXL",
                        ])
                      }
                      disabled={options.length >= 8}
                      className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Plus size={16} /> Add size option
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addPresetOption("Colour", ["Black", "White"])
                      }
                      disabled={options.length >= 8}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-50"
                    >
                      <Plus size={16} /> Add colour
                    </button>
                    <button
                      type="button"
                      onClick={() => addPresetOption()}
                      disabled={options.length >= 8}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-50"
                    >
                      <Plus size={16} /> Custom option
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {options.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line bg-background px-5 py-8 text-center text-sm text-muted">
                      This product has one default variant. Add options only when
                      customers need to choose between versions.
                    </div>
                  )}
                  {options.map((option, optionIndex) => {
                    const isColor = ["color", "colour"].includes(
                      option.name.trim().toLowerCase(),
                    );
                    return (
                      <div
                        key={option.id}
                        className="rounded-2xl border border-line p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                            {optionIndex + 1}
                          </span>
                          <input
                            value={option.name}
                            maxLength={80}
                            onChange={(event) =>
                              updateOption(option.id, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="Option name, e.g. Size or Storage"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setOptions((current) =>
                                current.filter(
                                  (item) => item.id !== option.id,
                                ),
                              )
                            }
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-error hover:bg-red-50"
                            aria-label="Remove option"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                        <div className="mt-3 space-y-2 pl-0 sm:pl-11">
                          {option.values.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              {isColor && (
                                <input
                                  type="color"
                                  value={item.hex}
                                  onChange={(event) =>
                                    updateOption(option.id, (current) => ({
                                      ...current,
                                      values: current.values.map((value) =>
                                        value.id === item.id
                                          ? {
                                              ...value,
                                              hex: event.target.value,
                                            }
                                          : value,
                                      ),
                                    }))
                                  }
                                  className="h-11 w-12 shrink-0 rounded-lg border border-line bg-white p-1"
                                  aria-label="Colour value"
                                />
                              )}
                              <input
                                value={item.value}
                                maxLength={120}
                                onChange={(event) =>
                                  updateOption(option.id, (current) => ({
                                    ...current,
                                    values: current.values.map((value) =>
                                      value.id === item.id
                                        ? {
                                            ...value,
                                            value: event.target.value,
                                          }
                                        : value,
                                    ),
                                  }))
                                }
                                className={inputClass}
                                placeholder={
                                  isColor
                                    ? "Black"
                                    : "Option value, e.g. 256 GB"
                                }
                              />
                              <button
                                type="button"
                                disabled={option.values.length === 1}
                                onClick={() =>
                                  updateOption(option.id, (current) => ({
                                    ...current,
                                    values: current.values.filter(
                                      (value) => value.id !== item.id,
                                    ),
                                  }))
                                }
                                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:text-error disabled:opacity-30"
                                aria-label="Remove option value"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={option.values.length >= 100}
                            onClick={() =>
                              updateOption(option.id, (current) => ({
                                ...current,
                                values: [
                                  ...current.values,
                                  {
                                    id: newId(),
                                    value: "",
                                    hex: "#1a1a1a",
                                  },
                                ],
                              }))
                            }
                            className="flex min-h-10 items-center gap-2 text-sm font-medium text-accent"
                          >
                            <Plus size={15} /> Add value
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={generateVariants}
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-surface sm:w-auto"
                >
                  <WandSparkles size={17} /> Generate {variantCount} variant
                  {variantCount === 1 ? "" : "s"}
                </button>
              </section>

              <section className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:px-7">
                  <div>
                    <h3 className="font-semibold">
                      Variant inventory ({variants.length})
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Delete combinations you do not sell and customise each
                      remaining row.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full text-left text-sm">
                    <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">Variant</th>
                        <th className="px-3 py-3">SKU *</th>
                        <th className="px-3 py-3">Barcode / GTIN</th>
                        <th className="px-3 py-3">Price override</th>
                        <th className="px-3 py-3">Sale price</th>
                        <th className="px-3 py-3">Stock</th>
                        <th className="px-3 py-3">Low at</th>
                        <th className="px-3 py-3">Weight (g)</th>
                        <th className="px-3 py-3">Active</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {variants.map((variant) => (
                        <tr key={variant.id}>
                          <td className="max-w-52 px-4 py-3 font-medium">
                            {Object.values(variant.optionValues).join(" / ") ||
                              "Default"}
                          </td>
                          {(
                            [
                              ["sku", "text"],
                              ["barcode", "text"],
                              ["priceOverride", "number"],
                              ["salePriceOverride", "number"],
                              ["stock", "number"],
                              ["lowStock", "number"],
                              ["weightGrams", "number"],
                            ] as const
                          ).map(([key, type]) => (
                            <td key={key} className="px-2 py-2">
                              <input
                                type={type}
                                min={type === "number" ? "0" : undefined}
                                step={
                                  ["priceOverride", "salePriceOverride"].includes(
                                    key,
                                  )
                                    ? "0.01"
                                    : "1"
                                }
                                value={variant[key]}
                                onChange={(event) =>
                                  setVariants((current) =>
                                    current.map((item) =>
                                      item.id === variant.id
                                        ? {
                                            ...item,
                                            [key]: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-10 w-full min-w-24 rounded-lg border border-line px-2 outline-none focus:border-accent"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(event) =>
                                setVariants((current) =>
                                  current.map((item) =>
                                    item.id === variant.id
                                      ? {
                                          ...item,
                                          isActive: event.target.checked,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="h-4 w-4 accent-accent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              disabled={variants.length === 1}
                              onClick={() =>
                                setVariants((current) =>
                                  current.filter(
                                    (item) => item.id !== variant.id,
                                  ),
                                )
                              }
                              className="grid h-10 w-10 place-items-center rounded-lg text-error hover:bg-red-50 disabled:opacity-30"
                              aria-label="Delete variant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {section === "seo" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <h3 className="text-xl font-semibold">Search optimisation</h3>
                <p className="mt-1 text-sm text-muted">
                  Customise how search engines and shared links describe this
                  product.
                </p>
                <div className="mt-6 grid gap-5">
                  <label>
                    <span className={labelClass}>SEO title</span>
                    <input
                      value={form.seoTitle}
                      maxLength={160}
                      onChange={(event) =>
                        update("seoTitle", event.target.value)
                      }
                      className={inputClass}
                      placeholder={form.name || "Product title"}
                    />
                    <span className="mt-1 block text-right text-xs text-muted">
                      {form.seoTitle.length}/160
                    </span>
                  </label>
                  <label>
                    <span className={labelClass}>Meta description</span>
                    <textarea
                      value={form.seoDescription}
                      maxLength={320}
                      rows={4}
                      onChange={(event) =>
                        update("seoDescription", event.target.value)
                      }
                      className={`${inputClass} py-3`}
                      placeholder={
                        form.shortDescription ||
                        "Concise product summary for search results"
                      }
                    />
                    <span className="mt-1 block text-right text-xs text-muted">
                      {form.seoDescription.length}/320
                    </span>
                  </label>
                </div>
                <div className="mt-6 rounded-xl border border-line bg-background p-5">
                  <p className="text-sm text-[#1a0dab]">
                    {form.seoTitle || form.name || "Product title"}
                  </p>
                  <p className="mt-1 text-xs text-[#006621]">
                    swoosh-shop-store.onrender.com/product/
                    {form.slug || "product-slug"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {form.seoDescription ||
                      form.shortDescription ||
                      "Your product description will appear here."}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <h3 className="font-semibold">Publishing</h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>Product status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        update(
                          "status",
                          event.target.value as "DRAFT" | "ACTIVE",
                        )
                      }
                      className={inputClass}
                    >
                      <option value="DRAFT">
                        Draft — hidden from customers
                      </option>
                      <option value="ACTIVE">
                        Active — publish immediately
                      </option>
                    </select>
                  </label>
                  <div className="space-y-2">
                    <span className={labelClass}>Merchandising</span>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(event) =>
                          update("isFeatured", event.target.checked)
                        }
                        className="accent-accent"
                      />
                      Show in Crafted for You / Customer Favourites
                    </label>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.isNewArrival}
                        onChange={(event) =>
                          update("isNewArrival", event.target.checked)
                        }
                        className="accent-accent"
                      />
                      Show in New Arrivals / Just Dropped
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-white p-4">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => setSection(sectionOrder[activeIndex - 1])}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            {activeIndex < sectionOrder.length - 1 ? (
              <button
                type="button"
                onClick={() => setSection(sectionOrder[activeIndex + 1])}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-surface"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Create product
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
