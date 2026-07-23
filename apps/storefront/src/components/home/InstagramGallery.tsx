import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Instagram } from "lucide-react";

const images = [
  { seed: "ig-1", colSpan: "col-span-2", rowSpan: "" },
  { seed: "ig-2", colSpan: "col-span-1", rowSpan: "" },
  { seed: "ig-3", colSpan: "col-span-1", rowSpan: "" },
  { seed: "ig-4", colSpan: "col-span-1", rowSpan: "" },
  { seed: "ig-5", colSpan: "col-span-1", rowSpan: "" },
  { seed: "ig-6", colSpan: "col-span-2", rowSpan: "" },
];

export default function InstagramGallery() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted mb-2">
            INSTAGRAM
          </p>
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">
            Follow Our Story
          </h2>
        </div>
        <a
          href="https://instagram.com/swoosh.bd"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted hover:text-ink transition-colors underline underline-offset-4"
        >
          @swoosh.bd
        </a>
      </motion.div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
        {images.map(({ seed, colSpan }, i) => (
          <motion.div
            key={seed}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`${colSpan} relative overflow-hidden group aspect-square`}
          >
            <img
              src={`https://picsum.photos/seed/${seed}/600/600`}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
              <Instagram
                size={28}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
