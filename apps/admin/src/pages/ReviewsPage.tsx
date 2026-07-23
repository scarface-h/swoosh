import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Star, X } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: { name: string };
  user: { name: string | null };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReviews(await adminApiFetch<Review[]>("/admin/reviews"));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load product reviews.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (review: Review, status: "APPROVED" | "REJECTED") => {
    setUpdating(review.id);
    setError("");
    try {
      await adminApiFetch(`/admin/reviews/${review.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to moderate the review.",
      );
    } finally {
      setUpdating("");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <h2 className="font-semibold text-ink">Product reviews</h2>
          <p className="mt-1 text-xs text-muted">
            Approve genuine feedback and reject inappropriate content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="grid h-11 w-11 place-items-center rounded-xl border border-line"
          aria-label="Refresh reviews"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {error && (
        <div className="m-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 size={17} className="animate-spin text-accent" />
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <div className="grid min-h-56 place-items-center p-6 text-center">
          <div>
            <Star className="mx-auto mb-3 text-muted" />
            <p className="text-sm text-muted">No product reviews yet.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {reviews.map((review) => (
            <article key={review.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-sm font-semibold text-warning">
                      <Star size={15} fill="currentColor" /> {review.rating}/5
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        review.status === "APPROVED"
                          ? "bg-success/10 text-success"
                          : review.status === "REJECTED"
                            ? "bg-error/10 text-error"
                            : "bg-warning/10 text-warning"
                      }`}
                    >
                      {review.status}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="rounded-full bg-info/10 px-2.5 py-1 text-[10px] font-semibold text-info">
                        VERIFIED PURCHASE
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">
                    {review.title ?? review.product.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {review.body}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    {review.user.name ?? "Customer"} · {review.product.name} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString("en-BD")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={updating === review.id}
                    onClick={() => void moderate(review, "APPROVED")}
                    className="flex min-h-10 items-center gap-2 rounded-xl border border-success/25 px-3 text-xs font-semibold text-success disabled:opacity-50"
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={updating === review.id}
                    onClick={() => void moderate(review, "REJECTED")}
                    className="flex min-h-10 items-center gap-2 rounded-xl border border-error/25 px-3 text-xs font-semibold text-error disabled:opacity-50"
                  >
                    <X size={15} /> Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
