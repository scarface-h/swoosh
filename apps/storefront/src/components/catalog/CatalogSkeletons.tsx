export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-3 md:gap-6"
      aria-label="Loading products"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[4/5] bg-line/70" />
          <div className="mt-3 h-3 w-1/3 rounded bg-line/70" />
          <div className="mt-2 h-4 w-4/5 rounded bg-line/70" />
          <div className="mt-2 h-4 w-2/5 rounded bg-line/70" />
        </div>
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      aria-label="Loading categories"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse border border-line bg-surface">
          <div className="aspect-[4/3] bg-line/70" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-2/3 rounded bg-line/70" />
            <div className="h-3 w-1/3 rounded bg-line/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollectionPageSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading collection" aria-busy="true">
      <div className="min-h-[48svh] bg-line/70" />
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-8 h-9 w-64 rounded bg-line/70" />
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
