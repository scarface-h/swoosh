import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { cn } from "@/lib/utils";

interface Product {
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

interface Props {
  products: Product[];
}

function ProductCard({ product, index, inView }: { product: Product; index: number; inView: boolean }) {
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
          />
          <img
            src={`${product.image}?v=2`}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />

          {product.badge && (
            <span className={cn(
              "absolute top-3 left-3 px-2 py-0.5 text-xs uppercase tracking-wider",
              product.badge === "Sale" ? "bg-accent text-light" : "bg-ink text-light"
            )}>
              {product.badge}
            </span>
          )}

          <button
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
            className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center bg-surface/90 backdrop-blur-sm hover:bg-surface transition-colors sm:top-3 sm:right-3"
            aria-label="Add to wishlist"
          >
            <Heart size={16} className={cn(wishlisted && "fill-accent text-accent")} />
          </button>

          <button
            onClick={(e) => e.preventDefault()}
            className="absolute bottom-0 left-0 right-0 hidden bg-ink text-light py-3 text-sm tracking-widest uppercase text-center translate-y-full transition-transform duration-300 group-hover:translate-y-0 md:block"
          >
            Quick Add
          </button>
        </div>
      </Link>

      <div className="mt-3">
        <p className="text-sm text-ink">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {product.salePrice ? (
            <>
              <span className="text-sm text-accent">{formatCurrency(product.salePrice)}</span>
              <span className="text-sm text-muted line-through">{formatCurrency(product.price)}</span>
            </>
          ) : (
            <span className="text-sm text-ink">{formatCurrency(product.price)}</span>
          )}
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {product.colors.map((color) => (
              <span
                key={color}
                className="w-3 h-3 rounded-full border border-line"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function BestsellerGrid({ products }: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 px-4 md:px-8 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-xs tracking-[0.3em] uppercase text-muted mb-2">BESTSELLERS</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink">Customer Favourites</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4 md:gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} inView={inView} />
        ))}
      </div>
    </section>
  );
}
