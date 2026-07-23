import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";

export default function CampaignBanner({ image }: { image?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="flex flex-col md:flex-row min-h-[80vh]">
      <div className="h-[46svh] min-h-72 w-full md:h-auto md:w-1/2">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(145deg,#241f1b,#a38c78)]" />
        )}
      </div>

      <div ref={ref} className="w-full md:w-1/2 bg-surface flex items-center justify-center px-5 py-12 sm:px-8 sm:py-16 md:py-0">
        <div className="max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-xs tracking-[0.3em] uppercase text-muted mb-4"
          >
            THE EVERYDAY EDIT
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink leading-tight"
          >
            Crafted for the way you move
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-sm sm:text-base text-muted mt-5 sm:mt-6 leading-relaxed"
          >
            Clean lines, premium materials and versatile silhouettes designed to carry you through every part of your day.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8"
          >
            <Link
              to="/shop"
              className="flex min-h-12 w-full sm:w-auto items-center justify-center bg-ink text-light px-8 py-3 text-sm tracking-widest uppercase hover:bg-ink/90 transition-colors"
            >
              Explore the Collection
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
