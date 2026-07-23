import type { PrismaClient } from "@prisma/client";

export const defaultCatalog = [
  {
    name: "Men",
    slug: "men",
    description: "Clothing, footwear and accessories for men.",
    children: [
      ["T-Shirts", "t-shirts"],
      ["Shirts", "mens-shirts"],
      ["Hoodies & Sweatshirts", "mens-hoodies-sweatshirts"],
      ["Trousers & Chinos", "mens-trousers-chinos"],
      ["Jeans", "mens-jeans"],
      ["Jackets & Coats", "mens-jackets-coats"],
      ["Traditional Wear", "mens-traditional-wear"],
      ["Activewear", "mens-activewear"],
    ],
  },
  {
    name: "Women",
    slug: "women",
    description: "Clothing, footwear and accessories for women.",
    children: [
      ["Dresses", "womens-dresses"],
      ["Tops & T-Shirts", "womens-tops-t-shirts"],
      ["Trousers & Jeans", "womens-trousers-jeans"],
      ["Skirts", "womens-skirts"],
      ["Sarees", "womens-sarees"],
      ["Modest Wear", "womens-modest-wear"],
      ["Jackets & Coats", "womens-jackets-coats"],
      ["Activewear", "womens-activewear"],
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Finishing touches for every look.",
    children: [
      ["Bags", "bags"],
      ["Watches", "watches"],
      ["Jewellery", "jewellery"],
      ["Sunglasses", "sunglasses"],
      ["Belts & Wallets", "belts-wallets"],
      ["Hats & Caps", "hats-caps"],
    ],
  },
  {
    name: "Footwear",
    slug: "footwear",
    description: "Shoes for everyday life and special occasions.",
    children: [
      ["Sneakers", "sneakers"],
      ["Formal Shoes", "formal-shoes"],
      ["Sandals & Slides", "sandals-slides"],
      ["Boots", "boots"],
    ],
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Clothing and essentials for children.",
    children: [
      ["Boys", "boys"],
      ["Girls", "girls"],
      ["Baby", "baby"],
      ["Kids Footwear", "kids-footwear"],
    ],
  },
  {
    name: "Beauty & Care",
    slug: "beauty-care",
    description: "Beauty, grooming and personal-care products.",
    children: [
      ["Skin Care", "skin-care"],
      ["Hair Care", "hair-care"],
      ["Makeup", "makeup"],
      ["Fragrance", "fragrance"],
      ["Grooming", "grooming"],
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Useful and beautiful products for the home.",
    children: [
      ["Home Decor", "home-decor"],
      ["Kitchen & Dining", "kitchen-dining"],
      ["Bedding & Bath", "bedding-bath"],
      ["Storage", "storage"],
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    description: "Personal electronics and useful accessories.",
    children: [
      ["Phones & Accessories", "phones-accessories"],
      ["Computing", "computing"],
      ["Audio", "audio"],
      ["TWS", "tws"],
      ["Smart Devices", "smart-devices"],
    ],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Gear for movement, training and the outdoors.",
    children: [
      ["Fitness", "fitness"],
      ["Team Sports", "team-sports"],
      ["Outdoor Gear", "outdoor-gear"],
    ],
  },
] as const;

export async function seedCatalog(prisma: PrismaClient) {
  for (const [rootIndex, department] of defaultCatalog.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: department.slug },
      update: {
        name: department.name,
        description: department.description,
        isActive: true,
        archivedAt: null,
        sortOrder: rootIndex,
      },
      create: {
        name: department.name,
        slug: department.slug,
        description: department.description,
        isActive: true,
        sortOrder: rootIndex,
      },
    });

    for (const [childIndex, [name, slug]] of department.children.entries()) {
      await prisma.category.upsert({
        where: { slug },
        update: {
          name,
          parentId: parent.id,
          isActive: true,
          archivedAt: null,
          sortOrder: childIndex,
        },
        create: {
          name,
          slug,
          parentId: parent.id,
          isActive: true,
          sortOrder: childIndex,
        },
      });
    }
  }

  await prisma.collection.upsert({
    where: { slug: "new-arrivals" },
    update: { name: "New Arrivals", isActive: true, isFeatured: true },
    create: {
      name: "New Arrivals",
      slug: "new-arrivals",
      description: "The latest products added to Swoosh.",
      isActive: true,
      isFeatured: true,
      sortOrder: 0,
    },
  });
}
