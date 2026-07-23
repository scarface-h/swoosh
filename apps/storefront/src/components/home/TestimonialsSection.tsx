import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Nadia Rahman", product: "Linen Oversized Shirt", quote: "The quality is unlike anything I've found locally. Wore it three days in a row.", rating: 5, seed: "t1" },
  { name: "Arif Hossain", product: "Slim Chino Trousers", quote: "Finally a brand that understands fit for Bangladeshi body types. Absolutely love it.", rating: 5, seed: "t2" },
  { name: "Tasnim Akter", product: "Cotton Midi Dress", quote: "Breathable, elegant, and holds up in the heat. My go-to for office days.", rating: 4, seed: "t3" },
  { name: "Sabbir Ahmed", product: "Classic Polo", quote: "Ordered twice already. The fabric softness after washing is still perfect.", rating: 5, seed: "t4" },
  { name: "Maliha Chowdhury", product: "Linen Wide-Leg Pants", quote: "Comfortable enough for commuting, polished enough for meetings. Brilliant.", rating: 5, seed: "t5" },
  { name: "Rafiq Islam", product: "Structured Blazer", quote: "Wore it to a wedding and got more compliments than the groom.", rating: 4, seed: "t6" },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 px-4 md:px-8 md:py-16 bg-surface">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-xs tracking-[0.3em] uppercase text-muted mb-2">REVIEWS</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink">What They're Saying</h2>
      </motion.div>

      <div
        className="-mx-4 flex scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory md:mx-0 md:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {testimonials.map((t, i) => (
          <motion.div
            key={t.seed}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="min-w-[82vw] max-w-[320px] bg-background border border-line p-5 sm:min-w-[320px] sm:p-8 flex-shrink-0 snap-start"
          >
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star
                  key={j}
                  size={14}
                  className={j < t.rating ? "fill-accent text-accent" : "text-line"}
                />
              ))}
            </div>
            <p className="text-ink italic leading-relaxed mb-6">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <img
                src={`https://picsum.photos/seed/${t.seed}/40/40`}
                alt={t.name}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-ink">{t.name}</p>
                <p className="text-xs text-muted">{t.product}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
