import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { type PublicCategory } from "@/lib/catalog";
import { CategoryGridSkeleton } from "@/components/catalog/CatalogSkeletons";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<PublicCategory[]>("/categories")
      .then(setCategories)
      .catch(() => setError("Categories are temporarily unavailable."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          Explore Swoosh
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          Shop by category
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Browse every department or jump directly into a product type.
        </p>
      </div>

      {loading ? (
        <CategoryGridSkeleton count={8} />
      ) : error ? (
        <div className="border border-line bg-surface px-6 py-16 text-center text-sm text-error">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <article
              key={category.id}
              className="group overflow-hidden border border-line bg-surface"
            >
              <Link
                to={`/shop?category=${category.slug}`}
                className="relative block aspect-[16/8] overflow-hidden"
              >
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className={`h-full w-full ${
                      index % 3 === 0
                        ? "bg-[linear-gradient(135deg,#756456,#28221e)]"
                        : index % 3 === 1
                          ? "bg-[linear-gradient(135deg,#d0c5b7,#725d50)]"
                          : "bg-[linear-gradient(135deg,#28302b,#8c877b)]"
                    }`}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                  <div>
                    <h2 className="font-serif text-2xl">{category.name}</h2>
                    <p className="mt-1 text-xs text-white/70">
                      {category._count?.products ?? 0} products
                    </p>
                  </div>
                  <ArrowUpRight size={19} />
                </div>
              </Link>
              {Boolean(category.children?.length) && (
                <div className="flex flex-wrap gap-2 p-4">
                  {category.children?.map((child) => (
                    <Link
                      key={child.id}
                      to={`/shop?category=${child.slug}`}
                      className="rounded-full border border-line bg-background px-3 py-2 text-xs text-ink transition-colors hover:border-ink"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
