import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
}

interface Props {
  products: Product[];
}

function PlaceholderCard({ index: _index }: { index: number }) {
  return (
    <div className="min-w-[78vw] max-w-[300px] sm:min-w-[260px] md:min-w-[300px] flex-shrink-0">
      <div className="aspect-[4/5] bg-surface animate-pulse" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-surface animate-pulse w-3/4" />
        <div className="h-4 bg-surface animate-pulse w-1/3" />
      </div>
    </div>
  );
}

export default function NewArrivalsRail({ products }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  const scroll = (dir: "left" | "right") => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} className="py-12 px-4 md:px-8 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="flex items-end justify-between mb-8"
      >
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted mb-2">NEW ARRIVALS</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink">Just Dropped</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 border border-line hover:bg-surface transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 border border-line hover:bg-surface transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link
            to="/shop?filter=new"
            className="text-sm tracking-widest uppercase underline underline-offset-4 text-ink hover:text-muted transition-colors"
          >
            View All
          </Link>
        </div>
      </motion.div>

      <div
        ref={railRef}
        className="-mx-4 flex scroll-px-4 gap-4 overflow-x-auto px-4 snap-x snap-mandatory scrollbar-hide pb-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <PlaceholderCard key={i} index={i} />)
          : products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="min-w-[78vw] max-w-[300px] sm:min-w-[260px] md:min-w-[300px] flex-shrink-0 snap-start"
              >
                <Link to={`/product/${product.slug}`} className="block group">
                  <div className="aspect-[4/5] overflow-hidden bg-surface">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-ink">{product.name}</p>
                    <div className="flex gap-2 mt-1">
                      {product.salePrice ? (
                        <>
                          <span className="text-sm text-accent">{formatCurrency(product.salePrice)}</span>
                          <span className="text-sm text-muted line-through">{formatCurrency(product.price)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-ink">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
      </div>
    </section>
  );
}
