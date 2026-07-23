import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
] as const;

const NEXT_STATUSES: Record<
  (typeof STATUSES)[number],
  (typeof STATUSES)[number][]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "RETURN_REQUESTED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURN_REQUESTED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: string;
  paymentStatus: string;
  status: (typeof STATUSES)[number];
  placedAt: string;
}

const money = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = filter ? `?status=${filter}` : "";
      setOrders(await adminApiFetch<Order[]>(`/admin/orders${query}`));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (order: Order, status: Order["status"]) => {
    if (status === order.status) return;
    setUpdating(order.id);
    setError("");
    try {
      await adminApiFetch(`/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.code === "INTERNAL_ERROR"
            ? "The order could not be updated safely. Refresh the list and try the next valid status."
            : caught.message
          : "Unable to update the order.",
      );
    } finally {
      setUpdating("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="grid h-11 w-11 place-items-center rounded-lg border border-line"
            aria-label="Refresh orders"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={17} className="animate-spin text-accent" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No orders found.</p>
        ) : (
          <div className="divide-y divide-line">
            {orders.map((order) => (
              <article
                key={order.id}
                className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_1.4fr_.8fr_1.2fr] lg:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(order.placedAt).toLocaleString("en-BD")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ink">{order.customerName}</p>
                  <p className="text-xs text-muted">{order.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {money.format(Number(order.grandTotal))}
                  </p>
                  <p className="text-xs text-muted">{order.paymentStatus}</p>
                </div>
                <select
                  value={order.status}
                  disabled={
                    updating === order.id ||
                    NEXT_STATUSES[order.status].length === 0
                  }
                  onChange={(event) =>
                    void updateStatus(
                      order,
                      event.target.value as Order["status"],
                    )
                  }
                  className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm disabled:opacity-50"
                  aria-label={`Status for order ${order.orderNumber}`}
                >
                  {[order.status, ...NEXT_STATUSES[order.status]].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
