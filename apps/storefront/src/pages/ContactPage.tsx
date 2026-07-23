import { useState } from "react";
import { AlertCircle, CheckCircle, Clock, Loader2, Mail } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await apiFetch("/contact", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          ...(form.subject.trim() ? { subject: form.subject.trim() } : {}),
          message: form.message.trim(),
        },
      });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const update =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setError("");
    };

  const fieldClass =
    "min-h-12 w-full border border-line bg-transparent px-4 text-sm outline-none focus:border-ink";

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl md:text-6xl">
        Get in Touch
      </h1>
      <p className="mt-3 text-base text-muted sm:text-lg">
        We would love to hear from you.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 sm:mt-16 lg:grid-cols-2 lg:gap-16">
        {sent ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
            <CheckCircle size={48} className="text-success" />
            <p className="font-serif text-xl">Message received.</p>
            <p className="max-w-sm text-sm text-muted">
              Our team will respond using the email address you provided.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            {error && (
              <div
                className="flex items-start gap-2 border border-error/30 bg-error/5 p-3 text-sm text-error"
                role="alert"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {(["name", "email", "subject"] as const).map((key) => (
              <label key={key}>
                <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  {key !== "subject" && " *"}
                </span>
                <input
                  required={key !== "subject"}
                  type={key === "email" ? "email" : "text"}
                  minLength={key === "name" ? 2 : undefined}
                  maxLength={key === "subject" ? 200 : 191}
                  value={form[key]}
                  onChange={update(key)}
                  className={fieldClass}
                />
              </label>
            ))}
            <label>
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Message *
              </span>
              <textarea
                required
                minLength={5}
                maxLength={5000}
                rows={7}
                value={form.message}
                onChange={update("message")}
                className={`${fieldClass} resize-y py-3`}
              />
            </label>
            <button
              type="submit"
              disabled={sending}
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-8 text-sm font-medium uppercase tracking-widest text-white disabled:opacity-60 sm:w-auto"
            >
              {sending && <Loader2 size={16} className="animate-spin" />}
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}

        <div>
          <div className="space-y-6 text-sm text-muted">
            <p className="flex items-start gap-3">
              <Mail size={19} className="shrink-0" />
              hello@swoosh.bd
            </p>
            <p className="flex items-start gap-3">
              <Clock size={19} className="shrink-0" />
              Sunday–Thursday, 10:00 AM–7:00 PM
            </p>
          </div>
          <div className="mt-8 border border-line bg-surface p-6 text-sm leading-relaxed text-muted">
            For order questions, include your order number and the phone number
            used at checkout so our team can help quickly.
          </div>
        </div>
      </div>
    </main>
  );
}
