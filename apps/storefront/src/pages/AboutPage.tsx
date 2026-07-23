import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <main>
      <div className="relative flex min-h-[68svh] items-end overflow-hidden bg-[radial-gradient(circle_at_70%_30%,#a88d75_0%,#46382e_38%,#171412_100%)] md:min-h-[60vh]">
        <div className="absolute -right-16 top-12 h-72 w-72 rounded-full border border-white/20 sm:h-96 sm:w-96" />
        <div className="absolute right-20 top-40 h-48 w-48 rounded-full border border-white/10 sm:h-64 sm:w-64" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 pb-10 sm:pb-16 px-4 sm:px-6 max-w-[1440px] mx-auto w-full">
          <h1 className="font-serif text-5xl sm:text-6xl md:text-8xl text-white">Our Story</h1>
        </div>
      </div>

      {/* Brand intro */}
      <Section className="py-14 sm:py-24 max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-lg text-[#1A1A1A] leading-relaxed">
          SWOOSH was founded in Dhaka with a single conviction: that premium fashion should be
          accessible to Bangladesh.
        </p>
        <p className="mt-5 text-[#6B6560] leading-relaxed">
          We believe that great design transcends borders. Every piece we create is a testament to
          the skill of local artisans and the vision of a more considered wardrobe — one built on
          quality, intention, and longevity rather than the noise of trend cycles.
        </p>
      </Section>

      {/* Split: founder + philosophy */}
      <Section className="py-12 sm:py-20 max-w-[1440px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <div className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-[linear-gradient(145deg,#d9c6b3,#6e5949)] px-8 text-center">
          <span className="font-serif text-4xl tracking-[0.22em] text-white/90 sm:text-6xl">
            FORM · CRAFT · PURPOSE
          </span>
        </div>
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A]">Design Philosophy</h2>
          <p className="mt-6 text-[#6B6560] leading-relaxed">
            Clean lines and deliberate proportions define every silhouette we produce. We resist the
            noise of trend cycles in favour of forms that endure — pieces that look as considered in
            five years as they do today.
          </p>
          <p className="mt-4 text-[#6B6560] leading-relaxed">
            Premium materials sourced with care form the foundation of our work. The hand of the
            fabric, the weight of the cloth, the finish of a seam — these details matter to us as
            much as the cut.
          </p>
        </div>
      </Section>

      {/* Values */}
      <Section className="py-12 sm:py-20 bg-surface">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Quality First",
              desc: "Every garment passes through rigorous quality checks before it reaches you. We accept nothing less.",
            },
            {
              title: "Conscious Design",
              desc: "We design with intention, minimising waste and maximising longevity in every piece we produce.",
            },
            {
              title: "Local Craft",
              desc: "Our production is rooted in Dhaka, supporting skilled local craftspeople and their communities.",
            },
          ].map((v) => (
            <div key={v.title} className="border-t-2 border-[#1A1A1A] pt-6">
              <h3 className="font-serif text-xl text-[#1A1A1A]">{v.title}</h3>
              <p className="text-[#6B6560] text-sm mt-2 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="aspect-[21/9] w-full bg-[linear-gradient(120deg,#191614_0%,#695546_48%,#c6ad96_100%)]" />
      </Section>

      {/* Materials */}
      <Section className="py-14 sm:py-24 max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-serif text-3xl text-[#1A1A1A]">Our Materials</h2>
        <p className="mt-6 text-[#6B6560] leading-relaxed">
          We source our fabrics from trusted mills across South Asia, prioritising natural fibres —
          cotton, linen, and wool — that breathe, age well, and leave a lighter footprint. Every
          material is chosen for how it feels, how it performs, and how it lasts.
        </p>
      </Section>
    </main>
  );
}
