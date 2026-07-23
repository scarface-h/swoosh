import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@swoosh/utilities";
import { useWishlistStore } from "@/stores/wishlistStore";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image: string;
  hoverImage: string;
  category: "Men" | "Women" | "Accessories";
  colors: { name: string; hex: string }[];
  sizes: string[];
  inStock: boolean;
  isNew: boolean;
};

const PRODUCTS: Product[] = [
  { id: "1", name: "Classic Linen Shirt", slug: "classic-linen-shirt", price: 2490, salePrice: 1990, image: "https://picsum.photos/seed/swoosh1/400/500", hoverImage: "https://picsum.photos/seed/swoosh1h/400/500", category: "Men", colors: [{ name: "White", hex: "#FFFFFF" }, { name: "Beige", hex: "#D4C5A9" }], sizes: ["S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "2", name: "Floral Wrap Dress", slug: "floral-wrap-dress", price: 3490, image: "https://picsum.photos/seed/swoosh2/400/500", hoverImage: "https://picsum.photos/seed/swoosh2h/400/500", category: "Women", colors: [{ name: "Rose", hex: "#E8A0A0" }, { name: "Navy", hex: "#1A2B4A" }], sizes: ["XS", "S", "M", "L"], inStock: true, isNew: true },
  { id: "3", name: "Leather Tote Bag", slug: "leather-tote-bag", price: 5490, image: "https://picsum.photos/seed/swoosh3/400/500", hoverImage: "https://picsum.photos/seed/swoosh3h/400/500", category: "Accessories", colors: [{ name: "Tan", hex: "#C4A882" }, { name: "Black", hex: "#1A1A1A" }], sizes: ["One Size"], inStock: true, isNew: true },
  { id: "4", name: "Slim Chino Pants", slug: "slim-chino-pants", price: 2990, image: "https://picsum.photos/seed/swoosh4/400/500", hoverImage: "https://picsum.photos/seed/swoosh4h/400/500", category: "Men", colors: [{ name: "Khaki", hex: "#C3B091" }, { name: "Olive", hex: "#6B7C4A" }], sizes: ["S", "M", "L", "XL"], inStock: false, isNew: false },
  { id: "5", name: "Silk Blouse", slug: "silk-blouse", price: 3990, salePrice: 2990, image: "https://picsum.photos/seed/swoosh5/400/500", hoverImage: "https://picsum.photos/seed/swoosh5h/400/500", category: "Women", colors: [{ name: "Ivory", hex: "#FFFFF0" }, { name: "Blush", hex: "#FFB6C1" }], sizes: ["XS", "S", "M"], inStock: true, isNew: false },
  { id: "6", name: "Canvas Sneakers", slug: "canvas-sneakers", price: 1990, image: "https://picsum.photos/seed/swoosh6/400/500", hoverImage: "https://picsum.photos/seed/swoosh6h/400/500", category: "Accessories", colors: [{ name: "White", hex: "#FFFFFF" }, { name: "Black", hex: "#1A1A1A" }], sizes: ["S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "7", name: "Merino Wool Sweater", slug: "merino-wool-sweater", price: 4490, image: "https://picsum.photos/seed/swoosh7/400/500", hoverImage: "https://picsum.photos/seed/swoosh7h/400/500", category: "Men", colors: [{ name: "Charcoal", hex: "#36454F" }, { name: "Cream", hex: "#FFFDD0" }], sizes: ["S", "M", "L", "XL"], inStock: true, isNew: true },
  { id: "8", name: "High-Waist Trousers", slug: "high-waist-trousers", price: 3290, image: "https://picsum.photos/seed/swoosh8/400/500", hoverImage: "https://picsum.photos/seed/swoosh8h/400/500", category: "Women", colors: [{ name: "Black", hex: "#1A1A1A" }, { name: "Camel", hex: "#C19A6B" }], sizes: ["XS", "S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "9", name: "Silk Scarf", slug: "silk-scarf", price: 1490, image: "https://picsum.photos/seed/swoosh9/400/500", hoverImage: "https://picsum.photos/seed/swoosh9h/400/500", category: "Accessories", colors: [{ name: "Multicolor", hex: "#E8D5B7" }], sizes: ["One Size"], inStock: true, isNew: false },
  { id: "10", name: "Oxford Button-Down", slug: "oxford-button-down", price: 2190, salePrice: 1690, image: "https://picsum.photos/seed/swoosh10/400/500", hoverImage: "https://picsum.photos/seed/swoosh10h/400/500", category: "Men", colors: [{ name: "Blue", hex: "#4A90D9" }, { name: "White", hex: "#FFFFFF" }], sizes: ["S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "11", name: "Maxi Linen Skirt", slug: "maxi-linen-skirt", price: 2790, image: "https://picsum.photos/seed/swoosh11/400/500", hoverImage: "https://picsum.photos/seed/swoosh11h/400/500", category: "Women", colors: [{ name: "Sand", hex: "#C2B280" }, { name: "White", hex: "#FFFFFF" }], sizes: ["XS", "S", "M", "L"], inStock: false, isNew: true },
  { id: "12", name: "Leather Belt", slug: "leather-belt", price: 990, image: "https://picsum.photos/seed/swoosh12/400/500", hoverImage: "https://picsum.photos/seed/swoosh12h/400/500", category: "Accessories", colors: [{ name: "Brown", hex: "#8B4513" }, { name: "Black", hex: "#1A1A1A" }], sizes: ["S", "M", "L"], inStock: true, isNew: false },
  { id: "13", name: "Denim Jacket", slug: "denim-jacket", price: 4990, image: "https://picsum.photos/seed/swoosh13/400/500", hoverImage: "https://picsum.photos/seed/swoosh13h/400/500", category: "Men", colors: [{ name: "Indigo", hex: "#4B0082" }, { name: "Light Blue", hex: "#ADD8E6" }], sizes: ["S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "14", name: "Cashmere Cardigan", slug: "cashmere-cardigan", price: 5990, salePrice: 4490, image: "https://picsum.photos/seed/swoosh14/400/500", hoverImage: "https://picsum.photos/seed/swoosh14h/400/500", category: "Women", colors: [{ name: "Dusty Rose", hex: "#DCAE96" }, { name: "Grey", hex: "#808080" }], sizes: ["XS", "S", "M", "L", "XL"], inStock: true, isNew: false },
  { id: "15", name: "Straw Hat", slug: "straw-hat", price: 1290, image: "https://picsum.photos/seed/swoosh15/400/500", hoverImage: "https://picsum.photos/seed/swoosh15h/400/500", category: "Accessories", colors: [{ name: "Natural", hex: "#E8D5A3" }], sizes: ["One Size"], inStock: true, isNew: true },
  { id: "16", name: "Linen Blazer", slug: "linen-blazer", price: 5490, image: "https://picsum.photos/seed/swoosh16/400/500", hoverImage: "https://picsum.photos/seed/swoosh16h/400/500", category: "Women", colors: [{ name: "Ecru", hex: "#F5F0E8" }, { name: "Navy", hex: "#1A2B4A" }], sizes: ["XS", "S", "M", "L"], inStock: true, isNew: true },
];

const CATEGORIES = ["All", "Men", "Women", "Accessories"] as const;
const SIZES = ["XS", "S", "M", "L", "XL"];
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price Low-High" },
  { value: "price-desc", label: "Price High-Low" },
];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[#DDD8D0] pb-4 mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-sm font-medium text-[#1A1A1A] mb-3">
        {title}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && children}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { items, toggleItem } = useWishlistStore();
  const inWishlist = items.includes(product.id);
  const activePrice = product.salePrice ?? product.price;

  return (
    <div className="relative group cursor-pointer">
      <Link to={`/product/${product.slug}`}>
        <div className="aspect-[4/5] overflow-hidden bg-surface relative">
          <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
          <img src={product.hoverImage} alt="" className="absolute inset-0 object-cover w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {!product.inStock ? (
            <span className="absolute top-2 left-2 bg-gray-400 text-white text-[10px] uppercase tracking-widest px-2 py-1">Sold Out</span>
          ) : product.salePrice ? (
            <span className="absolute top-2 left-2 bg-[#C44A2D] text-white text-[10px] uppercase tracking-widest px-2 py-1">Sale</span>
          ) : product.isNew ? (
            <span className="absolute top-2 left-2 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-widest px-2 py-1">New</span>
          ) : null}
        </div>
        <p className="text-xs uppercase text-[#6B6560] mt-3">{product.category}</p>
        <p className="text-sm font-medium text-[#1A1A1A] mt-1">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-[#1A1A1A]">{formatCurrency(activePrice)}</span>
          {product.salePrice && <span className="text-sm text-[#6B6560] line-through">{formatCurrency(product.price)}</span>}
        </div>
      </Link>
      <button
        onClick={() => toggleItem(product.id)}
        className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center bg-surface/90 rounded-full sm:top-2 sm:right-2"
        aria-label="Toggle wishlist"
      >

        <Heart className={cn("w-4 h-4", inWishlist ? "fill-[#C44A2D] text-[#C44A2D]" : "text-[#1A1A1A]")} />
      </button>
      <div className="flex gap-1 mt-2">
        {product.colors.map((c) => (
          <span key={c.name} title={c.name} style={{ backgroundColor: c.hex }} className="w-[10px] h-[10px] rounded-full border border-[#DDD8D0]" />
        ))}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<"All" | "Men" | "Women" | "Accessories">("All");
  const [sort, setSort] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCount, setShowCount] = useState(12);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (activeCategory !== "All" && p.category !== activeCategory) return false;
      if (selectedSizes.length > 0 && !selectedSizes.some((s) => p.sizes.includes(s))) return false;
      if (inStockOnly && !p.inStock) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    else if (sort === "price-desc") list = [...list].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    else if (sort === "newest") list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    return list;
  }, [activeCategory, selectedSizes, inStockOnly, sort]);

  const toggleSize = (s: string) =>
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const clearFilters = () => {
    setSelectedSizes([]);
    setInStockOnly(false);
    setActiveCategory("All");
  };

  const sidebar = (
    <div>
      <FilterSection title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSize(s)}
              className={cn("px-3 py-1 text-xs border rounded-full transition-colors", selectedSizes.includes(s) ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-[#DDD8D0] text-[#1A1A1A]")}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="Availability">
        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[#1A1A1A]" />
          In Stock Only
        </label>
      </FilterSection>
    </div>
  );

  return (
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 max-w-[1440px] mx-auto">
      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink">Shop</h1>
      <p className="text-sm text-[#6B6560] mt-2">{filtered.length} products</p>

      <div className="flex gap-2 flex-wrap mt-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setShowCount(12); }}
            className={cn("px-4 py-1.5 text-sm rounded-full transition-colors", activeCategory === cat ? "bg-[#1A1A1A] text-white" : "border border-[#DDD8D0] text-[#1A1A1A]")}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-10">
        <aside className="hidden lg:block w-56 shrink-0">{sidebar}</aside>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setFilterOpen(true)} className="lg:hidden flex items-center gap-2 text-sm border border-[#DDD8D0] px-3 py-1.5 rounded-full">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
            <div className="ml-auto">
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-[#DDD8D0] rounded px-3 py-1.5 bg-white text-[#1A1A1A]">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-[#6B6560]">No products found</p>
              <button onClick={clearFilters} className="text-sm underline text-[#1A1A1A]">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-3 md:gap-6">
                {filtered.slice(0, showCount).map((p) => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
              {showCount < filtered.length && (
                <div className="flex justify-center mt-10">
                  <button onClick={() => setShowCount((c) => c + 12)} className="px-8 py-3 border border-[#1A1A1A] text-sm text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFilterOpen(false)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.3 }} className="fixed inset-y-0 left-0 z-50 w-[min(88vw,22rem)] bg-surface p-5 sm:p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <span className="font-medium text-[#1A1A1A]">Filters</span>
                <button onClick={() => setFilterOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              {sidebar}
              <button onClick={() => { clearFilters(); setFilterOpen(false); }} className="text-sm underline text-[#6B6560] mt-2">Clear all</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
