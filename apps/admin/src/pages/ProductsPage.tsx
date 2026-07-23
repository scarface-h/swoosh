export default function ProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">Products</h1>
        <button className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors">
          Add Product
        </button>
      </div>
      <div className="bg-surface border border-line rounded-xl p-6">
        <p className="text-sm text-muted">No products to display.</p>
      </div>
    </div>
  );
}
