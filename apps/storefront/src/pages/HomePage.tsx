import { useEffect, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import NewArrivalsRail from "@/components/home/NewArrivalsRail";
import CampaignBanner from "@/components/home/CampaignBanner";
import BestsellerGrid from "@/components/home/BestsellerGrid";
import BrandValues from "@/components/home/BrandValues";
import NewsletterBanner from "@/components/home/NewsletterBanner";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import { apiFetch, apiFetchPage } from "@/lib/api";
import {
  type CatalogProduct,
  type PublicCategory,
  type PublicCollection,
  optionValues,
  productImage,
} from "@/lib/catalog";

interface HomeCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  badge?: "Sale" | "New";
  colors?: string[];
}

function toCard(product: CatalogProduct): HomeCard {
  const lowest = [...product.variants].sort(
    (a, b) => Number(a.price) - Number(b.price),
  )[0];
  const activePrice = Number(lowest?.price ?? product.priceFrom);
  const regularPrice = Number(lowest?.regularPrice ?? product.priceFrom);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: regularPrice,
    ...(activePrice < regularPrice ? { salePrice: activePrice } : {}),
    image: productImage(product),
    category: product.category?.name ?? "Swoosh",
    badge:
      activePrice < regularPrice
        ? "Sale"
        : product.isNewArrival
          ? "New"
          : undefined,
    colors: optionValues(product, "Color").map(
      (option) => option.metadata?.hex ?? "#d8d2ca",
    ),
  };
}

export default function HomePage() {
  const [newArrivals, setNewArrivals] = useState<HomeCard[]>([]);
  const [featured, setFeatured] = useState<HomeCard[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetchPage<CatalogProduct>(
        "/products?page=1&pageSize=8&newArrival=true&sort=newest",
      ),
      apiFetchPage<CatalogProduct>(
        "/products?page=1&pageSize=8&featured=true&sort=popular",
      ),
      apiFetchPage<CatalogProduct>("/products?page=1&pageSize=24&sort=newest"),
      apiFetch<PublicCategory[]>("/categories"),
      apiFetch<PublicCollection[]>("/collections"),
    ]).then(
      ([
        newResult,
        featuredResult,
        catalogResult,
        categoryResult,
        collectionResult,
      ]) => {
        if (newResult.status === "fulfilled")
          setNewArrivals(newResult.value.items.map(toCard));
        if (featuredResult.status === "fulfilled")
          setFeatured(featuredResult.value.items.map(toCard));
        if (catalogResult.status === "fulfilled")
          setCatalog(catalogResult.value.items);
        if (categoryResult.status === "fulfilled")
          setCategories(categoryResult.value);
        if (collectionResult.status === "fulfilled") {
          setCollections(
            collectionResult.value.filter(
              (collection) => collection.isFeatured,
            ),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryCards = categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image:
      category.imageUrl ??
      (catalog[index] ? productImage(catalog[index]) : ""),
  }));
  const heroImage =
    featured[0]?.image ??
    newArrivals[0]?.image ??
    (catalog[0] ? productImage(catalog[0]) : "");
  const campaignImage =
    featured[1]?.image ??
    newArrivals[1]?.image ??
    (catalog[1] ? productImage(catalog[1]) : "");

  return (
    <main>
      <HeroSection image={heroImage} />
      <CategoryGrid categories={categoryCards} loading={loading} />
      <NewArrivalsRail products={newArrivals} />
      <CampaignBanner image={campaignImage} />
      <FeaturedCollections collections={collections} />
      <BestsellerGrid products={featured} />
      <BrandValues />
      <NewsletterBanner />
    </main>
  );
}
