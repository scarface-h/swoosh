import { describe, expect, it } from "vitest";
import { fullProductBody } from "../modules/admin/admin.routes.js";

const product = {
  name: "Universal Product",
  slug: "universal-product",
  categoryId: "category-1",
  skuPrefix: "UNIVERSAL",
  shortDescription: null,
  description: "A complete product description.",
  regularPrice: 100,
  salePrice: null,
  saleStartsAt: null,
  saleEndsAt: null,
  status: "DRAFT",
  isFeatured: false,
  isNewArrival: false,
  tags: [],
  seoTitle: null,
  seoDescription: null,
  collectionIds: [],
};

describe("full product creation schema", () => {
  it("supports a product with a single default variant", () => {
    expect(
      fullProductBody.safeParse({
        product,
        options: [],
        variants: [
          {
            sku: "UNIVERSAL",
            barcode: null,
            priceOverride: null,
            salePriceOverride: null,
            initialStock: 10,
            lowStockThreshold: 2,
            weightGrams: 500,
            isActive: true,
            optionValues: {},
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("supports arbitrary option names and values", () => {
    expect(
      fullProductBody.safeParse({
        product,
        options: [
          {
            name: "Storage",
            values: [{ value: "256 GB" }, { value: "512 GB" }],
          },
          {
            name: "Voltage",
            values: [{ value: "110 V" }, { value: "220 V" }],
          },
        ],
        variants: [
          {
            sku: "UNIVERSAL-256-110",
            initialStock: 1,
            lowStockThreshold: 1,
            isActive: true,
            optionValues: { Storage: "256 GB", Voltage: "110 V" },
          },
          {
            sku: "UNIVERSAL-512-220",
            initialStock: 2,
            lowStockThreshold: 1,
            isActive: true,
            optionValues: { Storage: "512 GB", Voltage: "220 V" },
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate SKUs and duplicate option combinations", () => {
    const result = fullProductBody.safeParse({
      product,
      options: [{ name: "Size", values: [{ value: "M" }] }],
      variants: [
        {
          sku: "SAME",
          initialStock: 1,
          lowStockThreshold: 1,
          isActive: true,
          optionValues: { Size: "M" },
        },
        {
          sku: "SAME",
          initialStock: 1,
          lowStockThreshold: 1,
          isActive: true,
          optionValues: { Size: "M" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects variants that do not match the declared options", () => {
    const result = fullProductBody.safeParse({
      product,
      options: [{ name: "Material", values: [{ value: "Cotton" }] }],
      variants: [
        {
          sku: "BAD-MATERIAL",
          initialStock: 1,
          lowStockThreshold: 1,
          isActive: true,
          optionValues: { Material: "Steel" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
