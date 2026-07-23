import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Loader2,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminApiFetch, ApiError } from "@/lib/api";

interface DashboardSummary {
  ordersToday: number;
  pendingOrders: number;
  customers: number;
  lowStockVariants: number;
  salesToday: string;
}

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApiFetch<DashboardSummary>("/admin/dashboard")
      .then(setSummary)
      .catch((caught) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load dashboard data.",
        ),
      );
  }, []);

  const stats = summary
    ? [
        {
          label: "Sales today",
          value: money.format(Number(summary.salesToday)),
          icon: ShoppingCart,
        },
        {
          label: "Orders today",
          value: String(summary.ordersToday),
          icon: Truck,
        },
        {
          label: "Pending orders",
          value: String(summary.pendingOrders),
          icon: Boxes,
        },
        {
          label: "Active customers",
          value: String(summary.customers),
          icon: Users,
        },
      ]
    : [];

  return (
    <div>
      {error ? (
        <div className="flex min-h-48 items-center justify-center gap-3 rounded-xl border border-error/20 bg-error/5 p-6 text-sm text-error">
          <AlertCircle size={18} /> {error}
        </div>
      ) : !summary ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted">
          <Loader2 size={18} className="animate-spin text-accent" />
          Loading dashboard…
        </div>
      ) : (
        <>
          <section className="mb-6 overflow-hidden rounded-2xl bg-dark p-6 text-white shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Store operations
                </p>
                <h2 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
                  Welcome back. Your Swoosh workspace is ready.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                  Review today&apos;s sales, fulfill pending orders, and keep
                  inventory available for customers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/products"
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-[#ffffff] px-4 text-sm font-semibold text-[#17191e]"
                >
                  <Package size={16} /> Manage products
                </Link>
                <Link
                  to="/orders"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white"
                >
                  View orders <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                    {stat.label}
                  </span>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <stat.icon size={18} />
                  </span>
                </div>
                <p className="text-3xl font-semibold tracking-tight text-ink">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Inventory health
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">
                    Products needing attention
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    summary.lowStockVariants
                      ? "bg-warning/10 text-warning"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {summary.lowStockVariants
                    ? `${summary.lowStockVariants} low`
                    : "Healthy"}
                </span>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full ${
                    summary.lowStockVariants ? "bg-warning" : "bg-success"
                  }`}
                  style={{ width: "100%" }}
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {summary.lowStockVariants === 0
                  ? "No active variants are currently low on stock."
                  : `${summary.lowStockVariants} active variant${summary.lowStockVariants === 1 ? "" : "s"} need restocking. Open Products to make audited inventory adjustments.`}
              </p>
              <Link
                to="/products"
                className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent"
              >
                Review inventory <ArrowRight size={16} />
              </Link>
            </section>
            <section className="rounded-2xl border border-line bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Quick actions
              </p>
              <div className="mt-4 space-y-2">
                {[
                  {
                    label: "Add or edit products",
                    href: "/products",
                    icon: Package,
                  },
                  {
                    label: "Process pending orders",
                    href: "/orders",
                    icon: Truck,
                  },
                  {
                    label: "Update store settings",
                    href: "/settings",
                    icon: Settings,
                  },
                ].map((action) => (
                  <Link
                    key={action.href}
                    to={action.href}
                    className="flex min-h-12 items-center gap-3 rounded-xl bg-background px-3 text-sm font-medium text-ink hover:ring-1 hover:ring-line"
                  >
                    <action.icon size={17} className="text-muted" />
                    {action.label}
                    <ArrowRight size={15} className="ml-auto text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
