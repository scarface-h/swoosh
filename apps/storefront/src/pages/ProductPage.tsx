import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ChevronDown,
  Truck,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@swoosh/utilities";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  description: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  inStock: boolean;
  isNew: boolean;
  features: string[];
};

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Silk Oversized Blazer",
    slug: "silk-oversized-blazer",
    price: 289,
    images: [
      "https://picsum.photos/seed/product-silk-oversized-blazer-1/800/1000",
      "https://picsum.photos/seed/product-silk-oversized-blazer-2/800/1000",
      "https://picsum.photos/seed/product-silk-oversized-blazer-3/800/1000",
      "https://picsum.photos/seed/product-silk-oversized-blazer-4/800/1000",
    ],
    category: "Outerwear",
    description:
      "A luxuriously soft silk blazer with an oversized silhouette. Relaxed shoulders and a single-button closure create effortless elegance for any occasion.",
    colors: [
      { name: "Ivory", hex: "#F5F0E8" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Camel", hex: "#C4A882" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: true,
    features: [
      "100% Mulberry silk",
      "Oversized relaxed fit",
      "Single-button closure",
      "Fully lined interior",
      "Dry clean only",
    ],
  },
  {
    id: "2",
    name: "Cashmere Crew Sweater",
    slug: "cashmere-crew-sweater",
    price: 195,
    salePrice: 156,
    images: [
      "https://picsum.photos/seed/product-cashmere-crew-sweater-1/800/1000",
      "https://picsum.photos/seed/product-cashmere-crew-sweater-2/800/1000",
      "https://picsum.photos/seed/product-cashmere-crew-sweater-3/800/1000",
      "https://picsum.photos/seed/product-cashmere-crew-sweater-4/800/1000",
    ],
    category: "Knitwear",
    description:
      "Incredibly soft pure cashmere in a classic crew neck silhouette. Lightweight yet warm, perfect for layering through the seasons.",
    colors: [
      { name: "Oatmeal", hex: "#D4C9B8" },
      { name: "Charcoal", hex: "#3D3D3D" },
      { name: "Dusty Rose", hex: "#C9A9A6" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "100% Grade-A cashmere",
      "Regular fit crew neck",
      "Ribbed cuffs and hem",
      "Hand wash or dry clean",
      "Made in Scotland",
    ],
  },
  {
    id: "3",
    name: "Tailored Wide-Leg Trousers",
    slug: "tailored-wide-leg-trousers",
    price: 175,
    images: [
      "https://picsum.photos/seed/product-tailored-wide-leg-trousers-1/800/1000",
      "https://picsum.photos/seed/product-tailored-wide-leg-trousers-2/800/1000",
      "https://picsum.photos/seed/product-tailored-wide-leg-trousers-3/800/1000",
      "https://picsum.photos/seed/product-tailored-wide-leg-trousers-4/800/1000",
    ],
    category: "Bottoms",
    description:
      "Impeccably tailored wide-leg trousers with a high waist and pressed crease. A refined wardrobe staple that transitions seamlessly from office to evening.",
    colors: [
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Stone", hex: "#B8AFA3" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "Wool-blend fabric",
      "High-rise wide-leg cut",
      "Pressed center crease",
      "Side zip closure",
      "Dry clean recommended",
    ],
  },
  {
    id: "4",
    name: "Leather Crossbody Bag",
    slug: "leather-crossbody-bag",
    price: 320,
    images: [
      "https://picsum.photos/seed/product-leather-crossbody-bag-1/800/1000",
      "https://picsum.photos/seed/product-leather-crossbody-bag-2/800/1000",
      "https://picsum.photos/seed/product-leather-crossbody-bag-3/800/1000",
      "https://picsum.photos/seed/product-leather-crossbody-bag-4/800/1000",
    ],
    category: "Accessories",
    description:
      "A structured crossbody crafted from full-grain Italian leather. Minimal hardware and a clean design make this an everyday essential.",
    colors: [
      { name: "Tan", hex: "#B8875A" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["One Size"],
    inStock: true,
    isNew: true,
    features: [
      "Full-grain Italian leather",
      "Adjustable crossbody strap",
      "Interior zip pocket",
      "Magnetic snap closure",
      "Dimensions: 22 x 15 x 7 cm",
    ],
  },
  {
    id: "5",
    name: "Linen Relaxed Shirt",
    slug: "linen-relaxed-shirt",
    price: 120,
    images: [
      "https://picsum.photos/seed/product-linen-relaxed-shirt-1/800/1000",
      "https://picsum.photos/seed/product-linen-relaxed-shirt-2/800/1000",
      "https://picsum.photos/seed/product-linen-relaxed-shirt-3/800/1000",
      "https://picsum.photos/seed/product-linen-relaxed-shirt-4/800/1000",
    ],
    category: "Tops",
    description:
      "A breezy linen shirt with a relaxed drape and mother-of-pearl buttons. The perfect warm-weather piece for effortless style.",
    colors: [
      { name: "White", hex: "#FAFAFA" },
      { name: "Sky Blue", hex: "#A8C4D8" },
      { name: "Sand", hex: "#D4C4A8" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "100% European linen",
      "Relaxed oversized fit",
      "Mother-of-pearl buttons",
      "Chest patch pocket",
      "Machine washable",
    ],
  },
  {
    id: "6",
    name: "Merino Turtleneck",
    slug: "merino-turtleneck",
    price: 145,
    images: [
      "https://picsum.photos/seed/product-merino-turtleneck-1/800/1000",
      "https://picsum.photos/seed/product-merino-turtleneck-2/800/1000",
      "https://picsum.photos/seed/product-merino-turtleneck-3/800/1000",
      "https://picsum.photos/seed/product-merino-turtleneck-4/800/1000",
    ],
    category: "Knitwear",
    description:
      "A slim-profile merino wool turtleneck with a fine gauge knit. Warm, breathable, and versatile enough to wear on its own or layered under a blazer.",
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Cream", hex: "#F0E8D8" },
      { name: "Burgundy", hex: "#6B2D3E" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "100% Extra-fine merino wool",
      "Slim fit silhouette",
      "Fine gauge knit",
      "Ribbed cuffs and hem",
      "Machine wash cold",
    ],
  },
  {
    id: "7",
    name: "Wool Blend Coat",
    slug: "wool-blend-coat",
    price: 425,
    salePrice: 340,
    images: [
      "https://picsum.photos/seed/product-wool-blend-coat-1/800/1000",
      "https://picsum.photos/seed/product-wool-blend-coat-2/800/1000",
      "https://picsum.photos/seed/product-wool-blend-coat-3/800/1000",
      "https://picsum.photos/seed/product-wool-blend-coat-4/800/1000",
    ],
    category: "Outerwear",
    description:
      "A beautifully structured coat in a premium wool-cashmere blend. Double-breasted with horn buttons and a timeless silhouette that never goes out of style.",
    colors: [
      { name: "Camel", hex: "#C4A882" },
      { name: "Charcoal", hex: "#3D3D3D" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "80% Wool, 20% Cashmere",
      "Double-breasted closure",
      "Horn buttons",
      "Fully lined",
      "Professional dry clean only",
    ],
  },
  {
    id: "8",
    name: "Silk Slip Dress",
    slug: "silk-slip-dress",
    price: 225,
    images: [
      "https://picsum.photos/seed/product-silk-slip-dress-1/800/1000",
      "https://picsum.photos/seed/product-silk-slip-dress-2/800/1000",
      "https://picsum.photos/seed/product-silk-slip-dress-3/800/1000",
      "https://picsum.photos/seed/product-silk-slip-dress-4/800/1000",
    ],
    category: "Dresses",
    description:
      "An elegant midi-length slip dress in fluid silk charmeuse. Delicate spaghetti straps and a bias cut create a flattering drape on every body.",
    colors: [
      { name: "Champagne", hex: "#E8D8C4" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Sage", hex: "#A8B8A0" },
    ],
    sizes: ["XS", "S", "M", "L"],
    inStock: true,
    isNew: true,
    features: [
      "100% Silk charmeuse",
      "Bias-cut construction",
      "Adjustable spaghetti straps",
      "Midi length",
      "Hand wash or dry clean",
    ],
  },
  {
    id: "9",
    name: "Cotton Chino Shorts",
    slug: "cotton-chino-shorts",
    price: 85,
    images: [
      "https://picsum.photos/seed/product-cotton-chino-shorts-1/800/1000",
      "https://picsum.photos/seed/product-cotton-chino-shorts-2/800/1000",
      "https://picsum.photos/seed/product-cotton-chino-shorts-3/800/1000",
      "https://picsum.photos/seed/product-cotton-chino-shorts-4/800/1000",
    ],
    category: "Bottoms",
    description:
      "Classic chino shorts cut from brushed organic cotton. A relaxed mid-rise fit with a clean 7-inch inseam for warm-weather versatility.",
    colors: [
      { name: "Khaki", hex: "#C4B89C" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "White", hex: "#FAFAFA" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "100% Organic cotton twill",
      "Relaxed mid-rise fit",
      '7" inseam',
      "Side and back pockets",
      "Machine washable",
    ],
  },
  {
    id: "10",
    name: "Suede Chelsea Boots",
    slug: "suede-chelsea-boots",
    price: 275,
    images: [
      "https://picsum.photos/seed/product-suede-chelsea-boots-1/800/1000",
      "https://picsum.photos/seed/product-suede-chelsea-boots-2/800/1000",
      "https://picsum.photos/seed/product-suede-chelsea-boots-3/800/1000",
      "https://picsum.photos/seed/product-suede-chelsea-boots-4/800/1000",
    ],
    category: "Shoes",
    description:
      "Handcrafted Chelsea boots in premium Italian suede. Elastic side panels and a pull tab ensure easy on-and-off, while the leather sole ages beautifully.",
    colors: [
      { name: "Tobacco", hex: "#8B6B4A" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["39", "40", "41", "42", "43", "44", "45"],
    inStock: true,
    isNew: false,
    features: [
      "Italian suede upper",
      "Elastic side panels",
      "Leather sole with rubber grip",
      "Pull tab at heel",
      "Made in Italy",
    ],
  },
  {
    id: "11",
    name: "Ribbed Tank Top",
    slug: "ribbed-tank-top",
    price: 55,
    images: [
      "https://picsum.photos/seed/product-ribbed-tank-top-1/800/1000",
      "https://picsum.photos/seed/product-ribbed-tank-top-2/800/1000",
      "https://picsum.photos/seed/product-ribbed-tank-top-3/800/1000",
      "https://picsum.photos/seed/product-ribbed-tank-top-4/800/1000",
    ],
    category: "Tops",
    description:
      "A sleek ribbed tank in stretch organic cotton. The fitted silhouette and scoop neck make it a perfect layering piece or standalone essential.",
    colors: [
      { name: "White", hex: "#FAFAFA" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Grey Marl", hex: "#A8A8A8" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "95% Organic cotton, 5% elastane",
      "Fitted rib-knit construction",
      "Scoop neckline",
      "Reinforced seams",
      "Machine washable",
    ],
  },
  {
    id: "12",
    name: "Pleated Midi Skirt",
    slug: "pleated-midi-skirt",
    price: 165,
    salePrice: 115,
    images: [
      "https://picsum.photos/seed/product-pleated-midi-skirt-1/800/1000",
      "https://picsum.photos/seed/product-pleated-midi-skirt-2/800/1000",
      "https://picsum.photos/seed/product-pleated-midi-skirt-3/800/1000",
      "https://picsum.photos/seed/product-pleated-midi-skirt-4/800/1000",
    ],
    category: "Bottoms",
    description:
      "A fluid pleated midi skirt that moves beautifully with every step. Elasticated waist for comfort and a lustrous finish for elevated style.",
    colors: [
      { name: "Bronze", hex: "#B8956A" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Forest", hex: "#3D5A3D" },
    ],
    sizes: ["XS", "S", "M", "L"],
    inStock: true,
    isNew: false,
    features: [
      "Polyester satin blend",
      "Permanent pleating",
      "Elasticated waistband",
      "Midi length",
      "Machine wash cold, hang dry",
    ],
  },
  {
    id: "13",
    name: "Quilted Vest",
    slug: "quilted-vest",
    price: 198,
    images: [
      "https://picsum.photos/seed/product-quilted-vest-1/800/1000",
      "https://picsum.photos/seed/product-quilted-vest-2/800/1000",
      "https://picsum.photos/seed/product-quilted-vest-3/800/1000",
      "https://picsum.photos/seed/product-quilted-vest-4/800/1000",
    ],
    category: "Outerwear",
    description:
      "A lightweight quilted vest with recycled down filling. Snap-button closure and a stand collar provide warmth without bulk for transitional weather.",
    colors: [
      { name: "Olive", hex: "#6B7B5E" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    isNew: true,
    features: [
      "Recycled nylon shell",
      "Recycled down filling",
      "Snap-button closure",
      "Stand collar",
      "Machine washable",
    ],
  },
  {
    id: "14",
    name: "Woven Leather Belt",
    slug: "woven-leather-belt",
    price: 95,
    images: [
      "https://picsum.photos/seed/product-woven-leather-belt-1/800/1000",
      "https://picsum.photos/seed/product-woven-leather-belt-2/800/1000",
      "https://picsum.photos/seed/product-woven-leather-belt-3/800/1000",
      "https://picsum.photos/seed/product-woven-leather-belt-4/800/1000",
    ],
    category: "Accessories",
    description:
      "A hand-woven leather belt with a brushed silver buckle. The elastic weave provides flexibility and comfort throughout the day.",
    colors: [
      { name: "Brown", hex: "#7A5C3E" },
      { name: "Black", hex: "#1A1A1A" },
    ],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    isNew: false,
    features: [
      "Hand-woven leather strips",
      "Brushed silver buckle",
      "Elastic stretch weave",
      "3.5 cm width",
      "Made in Spain",
    ],
  },
  {
    id: "15",
    name: "Denim Jacket",
    slug: "denim-jacket",
    price: 185,
    images: [
      "https://picsum.photos/seed/product-denim-jacket-1/800/1000",
      "https://picsum.photos/seed/product-denim-jacket-2/800/1000",
      "https://picsum.photos/seed/product-denim-jacket-3/800/1000",
      "https://picsum.photos/seed/product-denim-jacket-4/800/1000",
    ],
    category: "Outerwear",
    description:
      "A classic denim jacket in selvedge Japanese denim. Pre-washed for a lived-in feel with a slightly boxy fit that layers effortlessly.",
    colors: [
      { name: "Indigo", hex: "#3A4F6F" },
      { name: "Washed Black", hex: "#4A4A4A" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: false,
    isNew: false,
    features: [
      "Japanese selvedge denim",
      "Pre-washed finish",
      "Boxy relaxed fit",
      "Button-front closure",
      "Machine wash cold",
    ],
  },
  {
    id: "16",
    name: "Wrap Midi Dress",
    slug: "wrap-midi-dress",
    price: 210,
    images: [
      "https://picsum.photos/seed/product-wrap-midi-dress-1/800/1000",
      "https://picsum.photos/seed/product-wrap-midi-dress-2/800/1000",
      "https://picsum.photos/seed/product-wrap-midi-dress-3/800/1000",
      "https://picsum.photos/seed/product-wrap-midi-dress-4/800/1000",
    ],
    category: "Dresses",
    description:
      "A flattering wrap dress in crepe fabric with a V-neckline and tie waist. The midi length and flutter sleeves add feminine elegance to any occasion.",
    colors: [
      { name: "Terracotta", hex: "#C47D5A" },
      { name: "Navy", hex: "#1B2A4A" },
      { name: "Ivory", hex: "#F5F0E8" },
    ],
    sizes: ["XS", "S", "M", "L"],
    inStock: true,
    isNew: true,
    features: [
      "Crepe fabric blend",
      "True wrap construction",
      "V-neckline with tie closure",
      "Flutter sleeves",
      "Machine wash delicate",
    ],
  },
];

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = PRODUCTS.find((p) => p.slug === slug);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState<
    "details" | "shipping" | null
  >(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  const addToCartRef = useRef<HTMLButtonElement>(null);

  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const wishlistItems = useWishlistStore((s) => s.items);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const button = addToCartRef.current;
    if (!button) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, [product]);

  if (!product) {
    return (
      <div className="pt-24 sm:pt-28 pb-20 max-w-[1440px] mx-auto px-4 sm:px-6 text-center">
        <h1 className="font-serif text-2xl text-[#1A1A1A] mb-4">
          Product not found
        </h1>
        <Link
          to="/shop"
          className="text-sm text-[#6B6560] underline hover:text-[#1A1A1A] transition-colors"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const currentPrice = product.salePrice ?? product.price;
  const discountPercent = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const isWishlisted = wishlistItems.includes(product.id);

  const relatedProducts = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) return;
    addItem({
      id: crypto.randomUUID(),
      variantId: `${product.id}-${selectedColor}-${selectedSize}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.images[0],
      colorName: selectedColor,
      sizeName: selectedSize,
      unitPrice: currentPrice,
      quantity,
      maxStock: 10,
    });
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
  };

  const toggleAccordion = (section: "details" | "shipping") => {
    setAccordionOpen((prev) => (prev === section ? null : section));
  };

  return (
    <div className="pt-24 sm:pt-28 pb-28 lg:pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs sm:text-sm text-muted mb-5 sm:mb-8 pb-1">
        <Link to="/" className="hover:text-[#1A1A1A] transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop" className="hover:text-[#1A1A1A] transition-colors">
          Shop
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>{product.category}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1A1A1A]">{product.name}</span>
      </nav>

      {/* Main Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10">
        {/* Left: Gallery */}
        <div className="lg:col-span-7">
          {/* Main Image */}
          <div className="aspect-[4/5] overflow-hidden bg-surface rounded-sm">
            <motion.img
              key={activeImage}
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={cn(
                  "w-16 h-20 shrink-0 overflow-hidden cursor-pointer rounded-sm",
                  activeImage === idx &&
                    "ring-2 ring-[#1A1A1A] ring-offset-2"
                )}
              >
                <img
                  src={img}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Info */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start space-y-5">
          {/* Category */}
          <p className="text-xs uppercase tracking-[0.15em] text-[#6B6560]">
            {product.category}
          </p>

          {/* Name */}
          <h1 className="font-serif text-2xl lg:text-3xl text-[#1A1A1A]">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-[#1A1A1A]">
              {formatCurrency(currentPrice)}
            </span>
            {product.salePrice && (
              <>
                <span className="text-sm text-[#6B6560] line-through">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  -{discountPercent}%
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-[#6B6560] leading-relaxed">
            {product.description}
          </p>

          <div className="border-t border-[#DDD8D0] my-5" />

          {/* Color Selector */}
          <div>
            <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-3">
              Color{" "}
              {selectedColor && (
                <span className="normal-case tracking-normal text-[#1A1A1A] ml-1">
                  — {selectedColor}
                </span>
              )}
            </p>
            <div className="flex gap-2.5">
              {product.colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={cn(
                    "w-7 h-7 rounded-full border border-[#DDD8D0] transition-all",
                    selectedColor === color.name &&
                      "ring-2 ring-offset-2 ring-[#1A1A1A]"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-3">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "min-w-[48px] h-12 px-3 border border-[#DDD8D0] text-sm transition-all hover:border-[#1A1A1A]",
                    selectedSize === size &&
                      "bg-[#1A1A1A] text-white border-transparent"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="inline-flex items-center border border-[#DDD8D0]">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-4 py-3 text-[#6B6560] hover:text-[#1A1A1A] transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 py-3 text-sm font-medium min-w-[48px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="px-4 py-3 text-[#6B6560] hover:text-[#1A1A1A] transition-colors"
              disabled={quantity >= 10}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Bag Button */}
          <button
            ref={addToCartRef}
            onClick={handleAddToCart}
            disabled={!selectedColor || !selectedSize || !product.inStock}
            className="w-full py-4 bg-[#1A1A1A] text-white text-sm uppercase tracking-widest font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {product.inStock ? "Add to Bag" : "Out of Stock"}
          </button>

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className="w-full py-4 border border-[#DDD8D0] text-sm uppercase tracking-widest font-medium flex items-center justify-center gap-2 hover:border-[#1A1A1A] transition-colors"
          >
            <Heart
              className={cn(
                "w-4 h-4",
                isWishlisted && "fill-[#1A1A1A] text-[#1A1A1A]"
              )}
            />
            {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
          </button>

          {/* Delivery Info */}
          <div className="flex items-center gap-2 text-xs text-[#6B6560]">
            <Truck className="w-4 h-4" />
            <span>Delivery across Bangladesh in 2–5 business days.</span>
          </div>

          {/* Accordions */}
          <div className="border-t border-[#DDD8D0] pt-2">
            {/* Product Details */}
            <div className="border-b border-[#DDD8D0]">
              <button
                onClick={() => toggleAccordion("details")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-[#1A1A1A]"
              >
                Product Details
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    accordionOpen === "details" && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {accordionOpen === "details" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ul className="pb-4 space-y-2">
                      {product.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-[#6B6560] flex items-start gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-[#6B6560] mt-2 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shipping & Returns */}
            <div className="border-b border-[#DDD8D0]">
              <button
                onClick={() => toggleAccordion("shipping")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-[#1A1A1A]"
              >
                Shipping &amp; Returns
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    accordionOpen === "shipping" && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {accordionOpen === "shipping" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-4 space-y-3 text-sm text-[#6B6560] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <Truck className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>
                          Dhaka delivery usually takes 2–3 business days.
                          Delivery elsewhere in Bangladesh usually takes 3–5
                          business days.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <RotateCcw className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>
                          Returns are accepted within 7 days of delivery. Items
                          must be unworn with the original tags attached. Final
                          sale items are not eligible for return.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 lg:hidden"
          >
            <div className="shrink-0">
              <span className="text-lg font-medium text-[#1A1A1A]">
                {formatCurrency(currentPrice)}
              </span>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!selectedColor || !selectedSize || !product.inStock}
              className="flex-1 py-3 bg-[#1A1A1A] text-white text-sm uppercase tracking-widest font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {product.inStock ? "Add to Bag" : "Out of Stock"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 sm:mt-20">
          <h2 className="font-serif text-2xl lg:text-3xl text-[#1A1A1A] mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group"
              >
                <div className="aspect-[3/4] overflow-hidden bg-[#F5F0E8] mb-3">
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="text-sm font-medium text-[#1A1A1A] mb-1">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#1A1A1A]">
                    {formatCurrency(item.salePrice ?? item.price)}
                  </span>
                  {item.salePrice && (
                    <span className="text-xs text-[#6B6560] line-through">
                      {formatCurrency(item.price)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
