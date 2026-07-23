import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";

interface CategoryCard {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export default function CategoryGrid({
  categories,
}: {
  categories: CategoryCard[];
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  if (!categories.length) return null;

  return (
    <section
      ref={ref}
      className="grid grid-cols-1 gap-1.5 p-1.5 sm:h-[88svh] sm:grid-cols-2 sm:grid-rows-[1.35fr_0.8fr] md:h-screen md:grid-rows-2 md:gap-2 md:p-2"
    >
      {categories.slice(0, 3).map((cat, i) => (
        <motion.div
          key={cat.slug}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: i * 0.15 }}
          className={
            i === 0
              ? "min-h-[62svh] sm:col-span-2 sm:min-h-0 md:col-span-1 md:row-span-2"
              : "min-h-[52svh] sm:col-span-1 sm:min-h-0"
          }
        >
          <Link
            to={`/shop?category=${cat.slug}`}
            className="group relative block h-full min-w-0 overflow-hidden"
          >
            {cat.image ? (
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#756456,#28221e)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="font-serif text-2xl text-white">{cat.name}</p>
              <p className="text-white/70 text-sm mt-1">Shop →</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </section>
  );
}
