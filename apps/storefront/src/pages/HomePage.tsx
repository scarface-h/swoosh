import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import NewArrivalsRail from "@/components/home/NewArrivalsRail";
import CampaignBanner from "@/components/home/CampaignBanner";
import BestsellerGrid from "@/components/home/BestsellerGrid";
import BrandValues from "@/components/home/BrandValues";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import InstagramGallery from "@/components/home/InstagramGallery";
import NewsletterBanner from "@/components/home/NewsletterBanner";

const mockProducts = [
  {
    id: "1",
    name: "Linen Oversized Shirt",
    slug: "linen-oversized-shirt",
    price: 3490,
    image: "https://picsum.photos/seed/prod-1/600/750",
    category: "men",
    badge: "New" as const,
    colors: ["#F5F0E8", "#C4A882", "#4A4A4A"],
    newArrival: true,
  },
  {
    id: "2",
    name: "Cotton Midi Dress",
    slug: "cotton-midi-dress",
    price: 4290,
    salePrice: 3490,
    image: "https://picsum.photos/seed/prod-2/600/750",
    category: "women",
    badge: "Sale" as const,
    colors: ["#E8D5C4", "#8B6F5E"],
    newArrival: true,
  },
  {
    id: "3",
    name: "Slim Chino Trousers",
    slug: "slim-chino-trousers",
    price: 2990,
    image: "https://picsum.photos/seed/prod-3/600/750",
    category: "men",
    colors: ["#C4A882", "#4A4A4A", "#2C2C2C"],
    newArrival: true,
  },
  {
    id: "4",
    name: "Linen Wide-Leg Pants",
    slug: "linen-wide-leg-pants",
    price: 3990,
    image: "https://picsum.photos/seed/prod-4/600/750",
    category: "women",
    badge: "New" as const,
    colors: ["#F5F0E8", "#D4C5B0"],
    newArrival: true,
  },
  {
    id: "5",
    name: "Classic Polo",
    slug: "classic-polo",
    price: 1490,
    image: "https://picsum.photos/seed/prod-5/600/750",
    category: "men",
    colors: ["#FFFFFF", "#4A4A4A", "#1A3A5C"],
    newArrival: false,
  },
  {
    id: "6",
    name: "Structured Blazer",
    slug: "structured-blazer",
    price: 5990,
    image: "https://picsum.photos/seed/prod-6/600/750",
    category: "men",
    colors: ["#2C2C2C", "#4A4A4A"],
    newArrival: false,
  },
  {
    id: "7",
    name: "Relaxed Linen Tee",
    slug: "relaxed-linen-tee",
    price: 1990,
    salePrice: 1490,
    image: "https://picsum.photos/seed/prod-7/600/750",
    category: "women",
    badge: "Sale" as const,
    colors: ["#F5F0E8", "#E8D5C4", "#C4A882"],
    newArrival: false,
  },
  {
    id: "8",
    name: "Pleated Midi Skirt",
    slug: "pleated-midi-skirt",
    price: 2490,
    image: "https://picsum.photos/seed/prod-8/600/750",
    category: "women",
    colors: ["#2C2C2C", "#8B6F5E"],
    newArrival: false,
  },
];

const newArrivals = mockProducts
  .filter((p) => p.newArrival)
  .map(({ newArrival: _, ...p }) => p);

const bestsellers = mockProducts.map(({ newArrival: _, ...p }) => ({
  ...p,
  colors: p.colors,
}));

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <CategoryGrid />
      <NewArrivalsRail products={newArrivals} />
      <CampaignBanner />
      <BestsellerGrid products={bestsellers} />
      <BrandValues />
      <TestimonialsSection />
      <InstagramGallery />
      <NewsletterBanner />
    </main>
  );
}
