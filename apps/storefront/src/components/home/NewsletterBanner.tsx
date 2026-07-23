import { useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

export default function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/newsletter", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSubmitted(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to subscribe right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section ref={ref} className="bg-dark py-20 px-4 md:px-8">
      <div className="max-w-xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="font-serif text-4xl md:text-5xl text-light mb-4"
        >
          Join the List
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-light/70 mb-8"
        >
          Early access, private offers and stories from behind the collection.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {submitted ? (
            <p className="text-light text-sm tracking-widest uppercase">
              You're on the list.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex w-full max-w-md border-b border-light/40 focus-within:border-light transition-colors">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 bg-transparent text-light placeholder-light/40 py-3 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-light hover:text-light/70 transition-colors pl-4 py-3"
                  aria-label="Subscribe"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
              {error && <p className="text-accent text-xs mt-1">{error}</p>}
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
