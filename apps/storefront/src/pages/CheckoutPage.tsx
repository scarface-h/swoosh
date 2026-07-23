import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatCurrency } from "@swoosh/utilities";
import { cn } from "@/lib/utils";

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

interface FormData {
  name: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  area: string;
  address: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const subtotalFn = useCartStore((s) => s.subtotal);
  const subtotal = subtotalFn();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    division: "",
    district: "",
    area: "",
    address: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  if (!items.length && !isSuccess) {
    return (
      <div className="pt-24 sm:pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <p className="font-serif text-2xl">Your cart is empty</p>
        <Link to="/shop" className="text-sm underline underline-offset-4">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const delivery = form.division === "Dhaka" ? 100 : 150;
  const total = subtotal + (form.division ? delivery : 0);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.division) newErrors.division = "Division is required";
    if (!form.district.trim()) newErrors.district = "District is required";
    if (!form.area.trim()) newErrors.area = "Area is required";
    if (!form.address.trim()) newErrors.address = "Address is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setTimeout(() => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setOrderNumber(`SW-2025-${code}`);
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  }

  if (isSuccess) {
    return (
      <div className="pt-24 sm:pt-32 pb-20 flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 sm:px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <CheckCircle size={72} className="text-green-600" />
        </motion.div>
        <h1 className="font-serif text-3xl">Order Confirmed!</h1>
        <p className="text-muted">Order number: {orderNumber}</p>
        <p className="text-sm text-muted max-w-md">
          This is a demonstration. No real order has been placed.
        </p>
        <Link
          to="/"
          className="mt-4 flex min-h-12 items-center bg-ink text-light px-8 py-3 text-sm uppercase tracking-widest hover:bg-dark transition-colors"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const inputClass = (field: string) =>
    cn(
      "w-full border bg-transparent px-4 py-3 text-sm outline-none transition-colors",
      errors[field] ? "border-error" : "border-line focus:border-ink"
    );

  return (
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      <h1 className="font-serif text-3xl sm:text-4xl mb-7 sm:mb-10">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
        <div className="lg:col-span-3">
          <p className="text-sm uppercase tracking-widest mb-6">Shipping Information</p>

          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputClass("name")}
              />
              {errors.name && <p className="text-xs text-[#B83232] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={inputClass("phone")}
              />
              {errors.phone && <p className="text-xs text-[#B83232] mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Email (optional)
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass("email")}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Division *
              </label>
              <select
                name="division"
                value={form.division}
                onChange={handleChange}
                className={inputClass("division")}
              >
                <option value="">Select Division</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.division && (
                <p className="text-xs text-[#B83232] mt-1">{errors.division}</p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                District *
              </label>
              <input
                type="text"
                name="district"
                value={form.district}
                onChange={handleChange}
                className={inputClass("district")}
              />
              {errors.district && (
                <p className="text-xs text-[#B83232] mt-1">{errors.district}</p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Area *
              </label>
              <input
                type="text"
                name="area"
                value={form.area}
                onChange={handleChange}
                className={inputClass("area")}
              />
              {errors.area && <p className="text-xs text-[#B83232] mt-1">{errors.area}</p>}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Complete Address *
              </label>
              <textarea
                name="address"
                rows={3}
                value={form.address}
                onChange={handleChange}
                className={inputClass("address")}
              />
              {errors.address && (
                <p className="text-xs text-[#B83232] mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#6B6560] mb-1.5">
                Order Notes (optional)
              </label>
              <textarea
                name="notes"
                rows={2}
                value={form.notes}
                onChange={handleChange}
                className={inputClass("notes")}
              />
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm uppercase tracking-widest mb-4">Payment Method</p>
            <label className="flex items-center gap-3 border border-[#DDD8D0] p-4 cursor-pointer">
              <input type="radio" name="payment" defaultChecked className="accent-[#1A1A1A]" />
              <span className="text-sm">Cash on Delivery</span>
              <span className="ml-auto text-xs bg-[#F5F0E8] px-2 py-0.5 uppercase tracking-wider text-[#6B6560]">
                COD
              </span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border border-line bg-surface p-5 sm:p-8 lg:sticky lg:top-32">
            <p className="text-sm uppercase tracking-widest mb-6">Order Summary</p>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-[60px] h-[75px] bg-background flex-shrink-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between text-sm">
                    <p className="line-clamp-1">{item.productName}</p>
                    <div className="flex justify-between text-muted">
                      <span>Qty: {item.quantity}</span>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery</span>
                <span>
                  {form.division
                    ? formatCurrency(delivery)
                    : "Select division"}
                </span>
              </div>
            </div>
            <div className="border-t border-line mt-3 pt-3 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 min-h-12 w-full bg-ink text-light py-4 text-sm uppercase tracking-widest hover:bg-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
