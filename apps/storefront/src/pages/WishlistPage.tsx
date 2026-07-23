import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCartStore } from "@/stores/cartStore";
import { formatCurrency } from "@swoosh/utilities";

const MOCK_PRODUCTS = [
  { id: "p1", slug: "air-max-pulse", name: "Air Max Pulse", price: 12999, color: "Black/White", size: "42", image: "/images/products/air-max-pulse.jpg" },
  { id: "p2", slug: "dunk-low-retro", name: "Dunk Low Retro", price: 10999, color: "White/Black", size: "42", image: "/images/products/dunk-low-retro.jpg" },
  { id: "p3", slug: "air-force-1-07", name: "Air Force 1 '07", price: 9999, color: "White", size: "42", image: "/images/products/air-force-1-07.jpg" },
  { id: "p4", slug: "jordan-1-retro-high", name: "Jordan 1 Retro High OG", price: 17999, color: "Chicago", size: "42", image: "/images/products/jordan-1-retro-high.jpg" },
  { id: "p5", slug: "air-zoom-pegasus-40", name: "Air Zoom Pegasus 40", price: 11999, color: "Blue/White", size: "42", image: "/images/products/air-zoom-pegasus-40.jpg" },
  { id: "p6", slug: "react-infinity-run-4", name: "React Infinity Run FK 4", price: 13999, color: "Black", size: "42", image: "/images/products/react-infinity-run-4.jpg" },
  { id: "p7", slug: "blazer-mid-77", name: "Blazer Mid '77 Vintage", price: 8999, color: "White/Black", size: "42", image: "/images/products/blazer-mid-77.jpg" },
  { id: "p8", slug: "air-max-90", name: "Air Max 90", price: 11499, color: "White/Grey", size: "42", image: "/images/products/air-max-90.jpg" },
  { id: "p9", slug: "free-run-5-0", name: "Free Run 5.0", price: 8499, color: "Volt/Black", size: "42", image: "/images/products/free-run-5-0.jpg" },
  { id: "p10", slug: "air-max-270", name: "Air Max 270", price: 13499, color: "Black/Red", size: "42", image: "/images/products/air-max-270.jpg" },
  { id: "p11", slug: "metcon-9", name: "Metcon 9", price: 12499, color: "Grey/White", size: "42", image: "/images/products/metcon-9.jpg" },
  { id: "p12", slug: "court-vision-low", name: "Court Vision Low", price: 6999, color: "White", size: "42", image: "/images/products/court-vision-low.jpg" },
  { id: "p13", slug: "air-max-plus", name: "Air Max Plus", price: 14999, color: "Black/Gold", size: "42", image: "/images/products/air-max-plus.jpg" },
  { id: "p14", slug: "revolution-7", name: "Revolution 7", price: 5999, color: "Navy/White", size: "42", image: "/images/products/revolution-7.jpg" },
  { id: "p15", slug: "air-zoom-structure-25", name: "Air Zoom Structure 25", price: 12999, color: "Blue/Silver", size: "42", image: "/images/products/air-zoom-structure-25.jpg" },
  { id: "p16", slug: "invincible-run-3", name: "Invincible Run FK 3", price: 18999, color: "White/Platinum", size: "42", image: "/images/products/invincible-run-3.jpg" },
];

export default function WishlistPage() {
  const { items: wishlistIds, removeItem } = useWishlistStore();
  const { addItem } = useCartStore();

  const wishlistProducts = MOCK_PRODUCTS.filter((p) => wishlistIds.includes(p.id));

  if (!wishlistIds.length) {
    return (
      <div className="pt-24 sm:pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Heart size={48} className="text-[#DDD8D0]" />
        <p className="font-serif text-2xl">Your wishlist is empty</p>
        <Link to="/shop" className="text-sm underline underline-offset-4">
          Discover Products
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      <div className="mb-7 sm:mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl inline">Wishlist</h1>
        <span className="text-muted ml-2 sm:ml-3">({wishlistProducts.length} items)</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4 md:gap-6">
        <AnimatePresence initial={false}>
          {wishlistProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Link to={`/product/${product.slug}`} className="block">
                <div className="aspect-[4/5] bg-[#F5F0E8] overflow-hidden">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                  <p className="text-sm text-[#6B6560] mt-0.5">{formatCurrency(product.price)}</p>
                </div>
              </Link>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    addItem({
                      id: crypto.randomUUID(),
                      variantId: `${product.id}-${product.color}-${product.size}`,
                      productId: product.id,
                      productName: product.name,
                      productSlug: product.slug,
                      imageUrl: product.image,
                      colorName: product.color,
                      sizeName: product.size,
                      unitPrice: product.price,
                      quantity: 1,
                      maxStock: 10,
                    });
                    removeItem(product.id);
                  }}
                  className="min-h-11 flex-1 bg-[#1A1A1A] text-white text-[11px] sm:text-xs py-2.5 uppercase tracking-wider sm:tracking-widest hover:bg-[#333] transition-colors"
                >
                  Add to Bag
                </button>
                <button
                  onClick={() => removeItem(product.id)}
                  className="flex min-h-11 min-w-11 items-center justify-center border border-[#DDD8D0] hover:border-[#1A1A1A] transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
