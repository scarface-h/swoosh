import { useEffect, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Loader2,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
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
      <h1 className="mb-6 text-2xl font-semibold text-ink">Dashboard</h1>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-line bg-surface p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted">{stat.label}</span>
                  <stat.icon size={18} className="text-muted" />
                </div>
                <p className="text-2xl font-semibold text-ink">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-line bg-surface p-6">
            <h2 className="text-lg font-medium text-ink">
              Inventory attention
            </h2>
            <p className="mt-2 text-sm text-muted">
              {summary.lowStockVariants === 0
                ? "No active variants are currently low on stock."
                : `${summary.lowStockVariants} active variant${summary.lowStockVariants === 1 ? "" : "s"} need restocking.`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
