import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

export default function HeroSection({ image }: { image?: string }) {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {image ? (
        <img
          src={image}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,#8b7765_0%,#352d28_42%,#171412_100%)]" />
      )}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
        <motion.p {...fadeUp(0)} className="text-xs tracking-[0.3em] uppercase text-white/70 mb-4">
          THE NEW COLLECTION
        </motion.p>
        <motion.h1 {...fadeUp(0.15)} className="font-serif text-[clamp(2.75rem,13vw,4.5rem)] text-white max-w-3xl mx-auto leading-[1.05]">
          Move with intent.
        </motion.h1>
        <motion.p {...fadeUp(0.3)} className="text-white/80 text-[15px] sm:text-lg max-w-xl mx-auto mt-5 leading-relaxed">
          Contemporary essentials for Bangladesh. Premium clothing designed for the way you live.
        </motion.p>
        <motion.div {...fadeUp(0.45)} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-8">
          <Link
            to="/shop?filter=new"
            className="flex min-h-12 w-full sm:w-auto items-center justify-center bg-white text-dark px-8 py-3 text-sm tracking-widest uppercase font-medium hover:bg-white/90 transition-colors"
          >
            Shop New Arrivals
          </Link>
          <Link
            to="/shop"
            className="flex min-h-12 w-full sm:w-auto items-center justify-center border border-white text-white px-8 py-3 text-sm tracking-widest uppercase font-medium hover:bg-white/10 transition-colors"
          >
            Explore Collections
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-white/60"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <ChevronDown size={24} />
      </motion.div>
    </section>
  );
}
