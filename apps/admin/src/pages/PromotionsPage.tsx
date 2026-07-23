import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Sparkles, TicketPercent } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  _count?: { usages: number };
}

const initial = () => ({
  code: "",
  type: "PERCENTAGE" as const,
  value: "10",
  minimumSpend: "",
  maximumDiscount: "",
  totalUsageLimit: "",
  perCustomerUsageLimit: "1",
  startsAt: new Date().toISOString().slice(0, 16),
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  firstOrderOnly: false,
  isActive: true,
});

export default function PromotionsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setCoupons(await adminApiFetch<Coupon[]>("/admin/coupons")); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Unable to load coupons."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const update = (key: keyof ReturnType<typeof initial>, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await adminApiFetch("/admin/coupons", { method: "POST", body: {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : null,
        maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
        totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : null,
        perCustomerUsageLimit: form.perCustomerUsageLimit ? Number(form.perCustomerUsageLimit) : null,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
        firstOrderOnly: form.firstOrderOnly,
        isActive: form.isActive,
        productIds: [],
        categoryIds: [],
      } });
      setForm(initial()); await load();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Unable to create coupon."); }
    finally { setSaving(false); }
  };
  const generateCode = () => update("code", `SWOOSH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  return <div className="space-y-6">
    {error && <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>}
    <form onSubmit={create} className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3"><TicketPercent className="text-accent" /><div><h2 className="text-xl font-semibold text-ink">Coupon generator</h2><p className="text-sm text-muted">Creates a site-wide coupon. Product eligibility is controlled in each product editor.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="lg:col-span-2"><span className="mb-1 block text-sm text-ink">Code</span><div className="flex gap-2"><input required minLength={3} value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-ink" /><button type="button" onClick={generateCode} className="rounded-xl border border-line px-3 text-sm"><Sparkles size={16} /></button></div></label>
        <label><span className="mb-1 block text-sm text-ink">Discount type</span><select value={form.type} onChange={(e) => update("type", e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink"><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed BDT</option></select></label>
        <Field label="Value" value={form.value} set={(v) => update("value", v)} required />
        <Field label="Minimum spend" value={form.minimumSpend} set={(v) => update("minimumSpend", v)} />
        <Field label="Maximum discount" value={form.maximumDiscount} set={(v) => update("maximumDiscount", v)} />
        <Field label="Total usage limit" value={form.totalUsageLimit} set={(v) => update("totalUsageLimit", v)} />
        <Field label="Per customer limit" value={form.perCustomerUsageLimit} set={(v) => update("perCustomerUsageLimit", v)} />
        <DateField label="Starts" value={form.startsAt} set={(v) => update("startsAt", v)} />
        <DateField label="Expires" value={form.expiresAt} set={(v) => update("expiresAt", v)} />
        <label className="flex items-center gap-2 pt-7 text-sm text-ink"><input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => update("firstOrderOnly", e.target.checked)} /> First order only</label>
        <label className="flex items-center gap-2 pt-7 text-sm text-ink"><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} /> Active immediately</label>
      </div>
      <button disabled={saving} className="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}Create coupon</button>
    </form>
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-ink">Coupons</h2><button onClick={() => void load()} className="rounded-xl border border-line p-2"><RefreshCw size={16} /></button></div>
      {loading ? <Loader2 className="animate-spin text-accent" /> : <div className="space-y-2">{coupons.map((coupon) => <div key={coupon.id} className="grid gap-2 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><strong className="text-ink">{coupon.code}</strong><span className="text-sm text-muted">{coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `৳${coupon.value}`}</span><span className="text-xs text-muted">{coupon._count?.usages ?? 0} uses</span><button onClick={async () => { await adminApiFetch(`/admin/coupons/${coupon.id}`, { method: "PATCH", body: { isActive: !coupon.isActive } }); await load(); }} className={`rounded-full px-3 py-1 text-xs ${coupon.isActive ? "bg-success/10 text-success" : "bg-background text-muted"}`}>{coupon.isActive ? "Active" : "Inactive"}</button></div>)}</div>}
    </section>
  </div>;
}
function Field({ label, value, set, required }: { label: string; value: string; set: (v: string) => void; required?: boolean }) { return <label><span className="mb-1 block text-sm text-ink">{label}</span><input required={required} type="number" min={required ? 0.01 : 0} step="0.01" value={value} onChange={(e) => set(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink" /></label>; }
function DateField({ label, value, set }: { label: string; value: string; set: (v: string) => void }) { return <label><span className="mb-1 block text-sm text-ink">{label}</span><input required type="datetime-local" value={value} onChange={(e) => set(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink" /></label>; }
