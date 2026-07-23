import { useEffect, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import NewArrivalsRail from "@/components/home/NewArrivalsRail";
import CampaignBanner from "@/components/home/CampaignBanner";
import BestsellerGrid from "@/components/home/BestsellerGrid";
import BrandValues from "@/components/home/BrandValues";
import NewsletterBanner from "@/components/home/NewsletterBanner";
import { apiFetchPage } from "@/lib/api";
import {
  type CatalogProduct,
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

  useEffect(() => {
    Promise.all([
      apiFetchPage<CatalogProduct>(
        "/products?page=1&pageSize=8&newArrival=true&sort=newest",
      ),
      apiFetchPage<CatalogProduct>(
        "/products?page=1&pageSize=8&featured=true&sort=popular",
      ),
      apiFetchPage<CatalogProduct>("/products?page=1&pageSize=24&sort=newest"),
    ])
      .then(([newResult, featuredResult, catalogResult]) => {
        setNewArrivals(newResult.items.map(toCard));
        setFeatured(featuredResult.items.map(toCard));
        setCatalog(catalogResult.items);
      })
      .catch(() => {
        setNewArrivals([]);
        setFeatured([]);
        setCatalog([]);
      });
  }, []);

  const categoryCards = Array.from(
    new Map(
      catalog
        .filter((product) => product.category)
        .map((product) => [
          product.category!.slug,
          {
            id: product.category!.slug,
            name: product.category!.name,
            slug: product.category!.slug,
            image: productImage(product),
          },
        ]),
    ).values(),
  );
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
      <CategoryGrid categories={categoryCards} />
      <NewArrivalsRail products={newArrivals} />
      <CampaignBanner image={campaignImage} />
      <BestsellerGrid products={featured} />
      <BrandValues />
      <NewsletterBanner />
    </main>
  );
}
