import { useParams, Link } from "react-router-dom";

const COLLECTIONS = [
  {
    slug: "summer-essentials",
    name: "Summer Essentials",
    description: "Lightweight pieces for the warmest days",
    longDescription:
      "A curated selection of breathable fabrics, relaxed silhouettes and sun-ready tones designed to carry you through the season with ease. Each piece balances comfort with a quiet sense of refinement.",
    image: "https://picsum.photos/seed/col-summer/1600/700",
    campaignImage: "https://picsum.photos/seed/col-summer-camp/800/1100",
  },
  {
    slug: "everyday-form",
    name: "Everyday Form",
    description: "Structured staples for daily wear",
    longDescription:
      "The foundation of a considered wardrobe. Clean lines, neutral palettes and durable construction make these pieces the ones you reach for first, season after season.",
    image: "https://picsum.photos/seed/col-everyday/1600/700",
    campaignImage: "https://picsum.photos/seed/col-everyday-camp/800/1100",
  },
  {
    slug: "new-arrivals",
    name: "New Arrivals",
    description: "The latest additions to our collection",
    longDescription:
      "Fresh perspectives on modern essentials. Discover the newest pieces added to our collection, featuring updated proportions and refined details for the season ahead.",
    image: "https://picsum.photos/seed/col-new/1600/700",
    campaignImage: "https://picsum.photos/seed/col-new-camp/800/1100",
  },
  {
    slug: "classic-edit",
    name: "Classic Edit",
    description: "Timeless designs that transcend trends",
    longDescription:
      "Pieces that remain relevant year after year. This edit brings together our most enduring designs — built on proportion, quality materials and restrained detail.",
    image: "https://picsum.photos/seed/col-classic/1600/700",
    campaignImage: "https://picsum.photos/seed/col-classic-camp/800/1100",
  },
];

const PRICES = [1490, 1990, 2490, 2990, 3490, 3990, 4490, 4990];

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const collection = COLLECTIONS.find((c) => c.slug === slug);

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="font-serif text-2xl text-[#1A1A1A]">Collection not found</p>
        <Link to="/shop" className="text-sm underline text-[#6B6560]">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <main>
      {/* Hero */}
      <div className="relative min-h-[68svh] md:min-h-[60vh] flex items-end">
        <img
          src={collection.image}
          alt={collection.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 pb-10 sm:pb-16 px-4 sm:px-6 max-w-[1440px] mx-auto w-full">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-3">Collection</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl text-white">{collection.name}</h1>
          <p className="text-white/80 mt-3 sm:mt-4 max-w-xl text-base sm:text-lg">{collection.description}</p>
        </div>
      </div>

      {/* Story */}
      <div className="py-12 sm:py-20 max-w-[1440px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <p className="font-serif text-xl leading-relaxed text-[#1A1A1A]">
          {collection.longDescription}
        </p>
        <img
          src={collection.campaignImage}
          alt={collection.name}
          className="aspect-[3/4] object-cover w-full"
        />
      </div>

      {/* Products */}
      <div className="py-12 sm:py-20 max-w-[1440px] mx-auto px-4 sm:px-6">
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] mb-8 sm:mb-12">From the Collection</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <Link key={i} to={`/product/${slug}-piece-${i + 1}`} className="group">
              <div className="aspect-[4/5] overflow-hidden bg-[#F5F0E8]">
                <img
                  src={`https://picsum.photos/seed/${slug}-prod-${i + 1}/400/500`}
                  alt={`Collection Piece ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wider text-[#6B6560]">{collection.name}</p>
                <p className="text-sm font-medium text-[#1A1A1A] mt-1">Collection Piece {i + 1}</p>
                <p className="text-sm text-[#6B6560] mt-1">৳{PRICES[i % PRICES.length].toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
