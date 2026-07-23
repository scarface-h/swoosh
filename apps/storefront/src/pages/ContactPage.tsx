import { useState } from "react";
import { MapPin, Phone, Mail, Clock, CheckCircle } from "lucide-react";

const inputClass =
  "w-full border border-[#DDD8D0] bg-transparent px-4 py-3 text-sm focus:border-[#1A1A1A] outline-none transition-colors";
const labelClass = "block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setIsSuccess(true); }, 1500);
  }

  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  return (
    <main className="pt-24 sm:pt-32 pb-16 sm:pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1A1A1A]">Get in Touch</h1>
      <p className="mt-3 sm:mt-4 text-[#6B6560] text-base sm:text-lg">We would love to hear from you.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mt-10 sm:mt-16">
        {/* Form */}
        <div>
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <CheckCircle className="w-12 h-12 text-[#287A55]" />
              <p className="font-serif text-xl text-[#1A1A1A]">
                Message sent. We'll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {(["name", "email", "subject"] as const).map((k) => (
                <div key={k}>
                  <label className={labelClass}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                    {k !== "subject" && " *"}
                  </label>
                  <input
                    type={k === "email" ? "email" : "text"}
                    value={form[k]}
                    onChange={set(k)}
                    className={`${inputClass} ${errors[k] ? "border-[#B83232]" : ""}`}
                  />
                  {errors[k] && <p className="text-xs text-[#B83232] mt-1">{errors[k]}</p>}
                </div>
              ))}
              <div>
                <label className={labelClass}>Message *</label>
                <textarea
                  rows={6}
                  value={form.message}
                  onChange={set("message")}
                  className={`${inputClass} resize-none ${errors.message ? "border-[#B83232]" : ""}`}
                />
                {errors.message && <p className="text-xs text-[#B83232] mt-1">{errors.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="min-h-12 w-full sm:w-auto self-start bg-[#1A1A1A] text-white px-8 py-4 text-sm uppercase tracking-widest font-medium hover:bg-[#C44A2D] transition-colors disabled:opacity-60"
              >
                {isLoading ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>

        {/* Contact info */}
        <div>
          <div className="flex flex-col gap-6">
            {[
              { icon: <MapPin className="w-5 h-5 mt-0.5 shrink-0" />, text: "House 42, Road 11, Dhanmondi, Dhaka 1205, Bangladesh" },
              { icon: <Phone className="w-5 h-5 mt-0.5 shrink-0" />, text: "+880 1234-567890" },
              { icon: <Mail className="w-5 h-5 mt-0.5 shrink-0" />, text: "hello@swoosh.bd" },
              { icon: <Clock className="w-5 h-5 mt-0.5 shrink-0" />, text: "Sunday–Thursday, 10:00 AM – 7:00 PM" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-[#6B6560] text-sm">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-surface h-56 sm:h-64 flex items-center justify-center text-[#6B6560] text-sm border border-[#DDD8D0]">
            Map placeholder
          </div>
        </div>
      </div>
    </main>
  );
}
