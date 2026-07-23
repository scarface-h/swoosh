import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicCollection } from "@/lib/catalog";

export default function FeaturedCollections({
  collections,
}: {
  collections: PublicCollection[];
}) {
  if (!collections.length) return null;

  return (
    <section className="px-4 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">
            CURATED EDITS
          </p>
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">
            Featured Collections
          </h2>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {collections.slice(0, 4).map((collection, index) => (
          <Link
            key={collection.id}
            to={`/collection/${collection.slug}`}
            className="group relative flex min-h-[22rem] items-end overflow-hidden bg-ink"
          >
            {collection.bannerUrl ? (
              <img
                src={collection.bannerUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div
                className={`absolute inset-0 ${
                  index % 2
                    ? "bg-[linear-gradient(135deg,#846f5e,#26211e)]"
                    : "bg-[linear-gradient(135deg,#1b211e,#827b70)]"
                }`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="relative flex w-full items-end justify-between gap-4 p-6 text-white sm:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Collection
                </p>
                <h3 className="mt-2 font-serif text-3xl">
                  {collection.name}
                </h3>
                {collection.description && (
                  <p className="mt-2 line-clamp-2 max-w-lg text-sm text-white/75">
                    {collection.description}
                  </p>
                )}
              </div>
              <ArrowUpRight className="shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
