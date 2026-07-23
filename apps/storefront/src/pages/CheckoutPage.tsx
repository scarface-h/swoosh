import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@swoosh/utilities";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";

const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  area: string;
  address: string;
  notes: string;
}

interface Pricing {
  subtotal: string;
  productDiscount: string;
  couponDiscount: string;
  deliveryCharge: string;
  grandTotal: string;
}

interface PreviewResponse {
  pricing: Pricing;
  warnings: Array<{ code: string; message: string }>;
}

interface OrderResponse {
  orderNumber: string;
  trackingToken: string;
  status: string;
  grandTotal: string;
}

const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  division: "",
  district: "",
  area: "",
  address: "",
  notes: "",
};

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const deliveryZone =
    form.division === "Dhaka" ? "DHAKA_INSIDE" : "OUTSIDE_DHAKA";
  const lines = items.map((item) => ({
    variantId: item.variantId,
    quantity: item.quantity,
    expectedUnitPrice: item.unitPrice.toFixed(2),
  }));

  useEffect(() => {
    if (!form.division || lines.length === 0) {
      setPricing(null);
      return;
    }

    const controller = new AbortController();
    setPreviewing(true);
    setRequestError("");
    apiFetch<PreviewResponse>("/checkout/preview", {
      method: "POST",
      signal: controller.signal,
      body: {
        items: lines,
        deliveryZone,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      },
    })
      .then((result) => {
        setPricing(result.pricing);
        setWarnings(result.warnings.map((warning) => warning.message));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setPricing(null);
        setRequestError(
          error instanceof ApiError
            ? error.message
            : "Unable to calculate the order total.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewing(false);
      });

    return () => controller.abort();
  }, [form.division, JSON.stringify(lines), deliveryZone, appliedCoupon]);

  if (!items.length && !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 pb-20 pt-24">
        <p className="font-serif text-2xl">Your cart is empty</p>
        <Link to="/shop" className="text-sm underline underline-offset-4">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const update = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setRequestError("");
    idempotencyKey.current = null;
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!/^[+0-9][0-9 -]{5,19}$/.test(form.phone.trim())) {
      next.phone = "Enter a valid phone number.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address.";
    }
    if (!form.division) next.division = "Division is required.";
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.area.trim()) next.area = "Area is required.";
    if (!form.address.trim()) next.address = "Complete address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || !pricing || submitting) return;

    setSubmitting(true);
    setRequestError("");
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const giftInstructions = items
        .filter((item) => item.giftRequested)
        .map((item) => `Gift: ${item.productName}${item.giftMessage ? ` — ${item.giftMessage}` : ""}`)
        .join("\n");
      const instructions = [form.notes.trim(), giftInstructions].filter(Boolean).join("\n");
      const created = await apiFetch<OrderResponse>("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: {
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            ...(form.email.trim() ? { email: form.email.trim() } : {}),
          },
          delivery: {
            division: form.division,
            district: form.district.trim(),
            area: form.area.trim(),
            addressLine: form.address.trim(),
            deliveryZone,
            ...(instructions ? { instructions } : {}),
          },
          items: lines,
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          clientGrandTotal: Number(pricing.grandTotal),
        },
      });
      setOrder(created);
      clearCart();
    } catch (error) {
      setRequestError(
        error instanceof ApiError
          ? error.message
          : "Unable to place the order. Please try again.",
      );
      if (error instanceof ApiError && error.code !== "IDEMPOTENCY_CONFLICT") {
        idempotencyKey.current = null;
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (order) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-5 px-4 pb-20 pt-24 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <CheckCircle size={64} className="text-success" />
        </motion.div>
        <h1 className="font-serif text-3xl">Order confirmed</h1>
        <p className="text-muted">
          Order number:{" "}
          <strong className="text-ink">{order.orderNumber}</strong>
        </p>
        <p className="text-sm text-muted">
          Total: {formatCurrency(Number(order.grandTotal))} · Cash on delivery
        </p>
        <p className="max-w-md text-sm text-muted">
          Keep your order number safe. We’ll contact you using the phone number
          supplied at checkout.
        </p>
        <Link
          to="/"
          className="mt-3 flex min-h-12 items-center bg-ink px-8 text-sm uppercase tracking-widest text-light"
        >
          Return home
        </Link>
      </div>
    );
  }

  const inputClass = (field: string) =>
    cn(
      "min-h-12 w-full border bg-transparent px-4 text-sm outline-none",
      errors[field] ? "border-error" : "border-line focus:border-ink",
    );

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
      <h1 className="mb-8 font-serif text-3xl sm:text-4xl">Checkout</h1>

      {requestError && (
        <div
          className="mb-6 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {requestError}
        </div>
      )}

      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12"
      >
        <div className="space-y-5 lg:col-span-3">
          <p className="text-sm uppercase tracking-widest">
            Shipping information
          </p>
          {[
            ["name", "Full name", "text"],
            ["phone", "Phone number", "tel"],
            ["email", "Email (optional)", "email"],
          ].map(([name, label, type]) => (
            <label key={name}>
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                {label}
              </span>
              <input
                name={name}
                type={type}
                value={form[name as keyof CheckoutForm]}
                onChange={update}
                className={inputClass(name)}
                autoComplete={
                  name === "name" ? "name" : name === "phone" ? "tel" : "email"
                }
              />
              {errors[name] && (
                <span className="mt-1 block text-xs text-error">
                  {errors[name]}
                </span>
              )}
            </label>
          ))}

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
              Division
            </span>
            <select
              name="division"
              value={form.division}
              onChange={update}
              className={inputClass("division")}
            >
              <option value="">Select division</option>
              {DIVISIONS.map((division) => (
                <option key={division}>{division}</option>
              ))}
            </select>
            {errors.division && (
              <span className="mt-1 block text-xs text-error">
                {errors.division}
              </span>
            )}
          </label>

          {[
            ["district", "District"],
            ["area", "Area"],
          ].map(([name, label]) => (
            <label key={name}>
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                {label}
              </span>
              <input
                name={name}
                value={form[name as keyof CheckoutForm]}
                onChange={update}
                className={inputClass(name)}
              />
              {errors[name] && (
                <span className="mt-1 block text-xs text-error">
                  {errors[name]}
                </span>
              )}
            </label>
          ))}

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
              Complete address
            </span>
            <textarea
              name="address"
              rows={3}
              value={form.address}
              onChange={update}
              className={cn(inputClass("address"), "py-3")}
            />
            {errors.address && (
              <span className="mt-1 block text-xs text-error">
                {errors.address}
              </span>
            )}
          </label>

          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
              Delivery instructions (optional)
            </span>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={update}
              className={cn(inputClass("notes"), "py-3")}
            />
          </label>

          <div>
            <p className="mb-4 text-sm uppercase tracking-widest">
              Payment method
            </p>
            <div className="flex min-h-14 items-center gap-3 border border-line p-4">
              <input type="radio" checked readOnly className="accent-ink" />
              <span className="text-sm">Cash on Delivery</span>
              <span className="ml-auto bg-background px-2 py-1 text-xs text-muted">
                COD
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border border-line bg-surface p-5 sm:p-7 lg:sticky lg:top-28">
            <p className="mb-6 text-sm uppercase tracking-widest">
              Order summary
            </p>
            <div className="mb-5 space-y-4">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-3">
                  <div className="h-[75px] w-[60px] shrink-0 overflow-hidden bg-background">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">{item.productName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {[item.colorName, item.sizeName]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                    {item.giftRequested && <p className="mt-1 text-xs text-success">Gift option selected</p>}
                    <div className="mt-2 flex justify-between text-muted">
                      <span>Qty: {item.quantity}</span>
                      <span>
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-5 border-t border-line pt-4">
              <label className="mb-2 block text-xs uppercase tracking-wider text-muted">Coupon code</label>
              <div className="flex gap-2">
                <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Enter code" className="min-h-11 min-w-0 flex-1 border border-line bg-transparent px-3 text-sm uppercase outline-none focus:border-ink" />
                <button type="button" disabled={!couponCode.trim()} onClick={() => setAppliedCoupon(couponCode.trim().toUpperCase())}
                  className="min-h-11 border border-ink px-4 text-xs font-medium uppercase disabled:opacity-40">Apply</button>
              </div>
              {appliedCoupon && <button type="button" className="mt-2 text-xs text-success underline" onClick={() => { setAppliedCoupon(""); setCouponCode(""); }}>Applied: {appliedCoupon} — remove</button>}
            </div>

            {previewing ? (
              <div className="flex min-h-24 items-center justify-center gap-2 border-t border-line text-sm text-muted">
                <Loader2 size={16} className="animate-spin" /> Calculating…
              </div>
            ) : pricing ? (
              <div className="space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(pricing.subtotal))}</span>
                </div>
                {Number(pricing.couponDiscount) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>
                      -{formatCurrency(Number(pricing.couponDiscount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted">
                  <span>Delivery</span>
                  <span>{formatCurrency(Number(pricing.deliveryCharge))}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(Number(pricing.grandTotal))}</span>
                </div>
              </div>
            ) : (
              <p className="border-t border-line py-4 text-sm text-muted">
                Select a division to calculate the authoritative total.
              </p>
            )}

            {warnings.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-warning">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={submitting || previewing || !pricing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-4 text-sm font-medium uppercase tracking-widest text-light disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
