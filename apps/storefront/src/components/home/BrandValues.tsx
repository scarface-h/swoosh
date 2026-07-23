import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Truck, RefreshCw, Shield, Heart } from "lucide-react";

const values = [
  { icon: Truck, title: "Nationwide Delivery", desc: "Delivering across Bangladesh with care" },
  { icon: RefreshCw, title: "Easy Exchange", desc: "Hassle-free exchanges within 7 days" },
  { icon: Shield, title: "Premium Quality", desc: "Carefully sourced materials built to last" },
  { icon: Heart, title: "Made for Bangladesh", desc: "Designed for our climate and lifestyle" },
];

export default function BrandValues() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 px-4 md:px-8 border-t border-line">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {values.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`flex flex-col items-center text-center px-6 py-8 ${i < values.length - 1 ? "md:border-r border-line" : ""}`}
          >
            <Icon size={24} className="text-ink mb-4" strokeWidth={1.5} />
            <p className="text-sm font-medium text-ink mb-1">{title}</p>
            <p className="text-xs text-muted leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
