import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCustomers(await adminApiFetch<Customer[]>("/admin/customers"));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (customer: Customer) => {
    setUpdating(customer.id);
    setError("");
    try {
      const status = customer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await adminApiFetch(`/admin/customers/${customer.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? { ...item, status } : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update the customer.",
      );
    } finally {
      setUpdating("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Customers</h1>
        <button
          type="button"
          onClick={() => void load()}
          className="grid h-11 w-11 place-items-center rounded-lg border border-line"
          aria-label="Refresh customers"
        >
          <RefreshCw size={17} />
        </button>
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
            Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No customers found.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {customers.map((customer) => (
              <article
                key={customer.id}
                className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[1fr_1.4fr_.8fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {customer.name}
                  </p>
                  <p className="text-xs text-muted">
                    Joined {new Date(customer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{customer.email}</p>
                  <p className="text-xs text-muted">
                    {customer.phone ?? "No phone"}
                  </p>
                </div>
                <span
                  className={
                    customer.status === "ACTIVE"
                      ? "text-sm text-success"
                      : "text-sm text-error"
                  }
                >
                  {customer.status.toLowerCase()}
                </span>
                <button
                  type="button"
                  disabled={updating === customer.id}
                  onClick={() => void toggleStatus(customer)}
                  className="min-h-10 rounded-lg border border-line px-3 text-sm font-medium disabled:opacity-50"
                >
                  {customer.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
