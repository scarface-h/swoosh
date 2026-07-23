import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Men", image: "https://picsum.photos/seed/cat-men/800/1000", slug: "men" },
  { name: "Women", image: "https://picsum.photos/seed/cat-women/800/1000", slug: "women" },
  { name: "Accessories", image: "https://picsum.photos/seed/cat-acc/800/1000", slug: "accessories" },
];

export default function CategoryGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="grid h-[88svh] grid-cols-2 grid-rows-[1.35fr_0.8fr] gap-1.5 p-1.5 md:h-screen md:grid-rows-2 md:gap-2 md:p-2">
      {categories.map((cat, i) => (
        <motion.div
          key={cat.slug}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: i * 0.15 }}
          className={i === 0 ? "col-span-2 md:col-span-1 md:row-span-2" : "col-span-1"}
        >
          <Link
            to={`/shop?category=${cat.slug}`}
            className="relative block w-full h-full overflow-hidden group"
          >
            <img
              src={cat.image}
              alt={cat.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
              <p className="font-serif text-xl text-white sm:text-2xl">{cat.name}</p>
              <p className="text-white/70 text-sm mt-1">Shop →</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </section>
  );
}
