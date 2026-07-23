import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  type PublicCategory,
  type PublicCollection,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

const preferredDepartments = ["men", "women", "accessories"];
const fallbackCategories: PublicCategory[] = [
  {
    id: "fallback-men",
    name: "Men",
    slug: "men",
    children: [
      { id: "fallback-men-tshirts", name: "T-Shirts", slug: "t-shirts" },
      { id: "fallback-men-shirts", name: "Shirts", slug: "mens-shirts" },
      {
        id: "fallback-men-hoodies",
        name: "Hoodies & Sweatshirts",
        slug: "mens-hoodies-sweatshirts",
      },
      { id: "fallback-men-jeans", name: "Jeans", slug: "mens-jeans" },
    ],
  },
  {
    id: "fallback-women",
    name: "Women",
    slug: "women",
    children: [
      { id: "fallback-women-dresses", name: "Dresses", slug: "womens-dresses" },
      {
        id: "fallback-women-tops",
        name: "Tops & T-Shirts",
        slug: "womens-tops-t-shirts",
      },
      { id: "fallback-women-sarees", name: "Sarees", slug: "womens-sarees" },
      {
        id: "fallback-women-modest",
        name: "Modest Wear",
        slug: "womens-modest-wear",
      },
    ],
  },
  {
    id: "fallback-accessories",
    name: "Accessories",
    slug: "accessories",
    children: [
      { id: "fallback-bags", name: "Bags", slug: "bags" },
      { id: "fallback-watches", name: "Watches", slug: "watches" },
      { id: "fallback-jewellery", name: "Jewellery", slug: "jewellery" },
      { id: "fallback-sunglasses", name: "Sunglasses", slug: "sunglasses" },
    ],
  },
  { id: "fallback-footwear", name: "Footwear", slug: "footwear" },
  { id: "fallback-kids", name: "Kids", slug: "kids" },
  { id: "fallback-beauty", name: "Beauty & Care", slug: "beauty-care" },
];
const fallbackCollections: PublicCollection[] = [
  {
    id: "fallback-new-arrivals",
    name: "New Arrivals",
    slug: "new-arrivals",
    description: null,
    bannerUrl: null,
    seoTitle: null,
    seoDescription: null,
  },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState<
    "categories" | "collections" | null
  >(null);
  const [categories, setCategories] =
    useState<PublicCategory[]>(fallbackCategories);
  const [collections, setCollections] =
    useState<PublicCollection[]>(fallbackCollections);
  const { pathname } = useLocation();
  const itemCount = useCartStore((state) => state.itemCount());
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const openCart = useCartStore((state) => state.openCart);

  const overlaysHero =
    pathname === "/" || pathname === "/about" || pathname.startsWith("/collection/");
  const solid = scrolled || !overlaysHero || menuOpen;
  const iconColor = solid ? "text-ink" : "text-white";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const retryTimers: number[] = [];
    const loadCategories = (attempt = 0) => {
      apiFetch<PublicCategory[]>("/categories")
        .then((items) => {
          if (!cancelled && items.length) setCategories(items);
        })
        .catch(() => {
          if (!cancelled && attempt < 2) {
            retryTimers.push(
              window.setTimeout(() => loadCategories(attempt + 1), 1500 * (attempt + 1)),
            );
          }
        });
    };
    const loadCollections = (attempt = 0) => {
      apiFetch<PublicCollection[]>("/collections")
        .then((items) => {
          if (!cancelled && items.length) setCollections(items);
        })
        .catch(() => {
          if (!cancelled && attempt < 2) {
            retryTimers.push(
              window.setTimeout(
                () => loadCollections(attempt + 1),
                1500 * (attempt + 1),
              ),
            );
          }
        });
    };
    loadCategories();
    loadCollections();
    return () => {
      cancelled = true;
      retryTimers.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDesktopMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!desktopMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopMenu(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [desktopMenu]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const primaryCategories = useMemo(
    () =>
      preferredDepartments
        .map((slug) => categories.find((category) => category.slug === slug))
        .filter((category): category is PublicCategory => Boolean(category)),
    [categories],
  );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          solid
            ? "border-b border-line bg-surface/95 shadow-[0_1px_0_rgba(20,20,20,0.02)] backdrop-blur-md"
            : "bg-gradient-to-b from-black/35 to-transparent",
        )}
      >
        <div className="relative mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-12">
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center -ml-2 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X size={22} className="text-ink" />
            ) : (
              <Menu size={22} className={iconColor} />
            )}
          </button>

          <Link
            to="/"
            className={cn(
              "absolute left-1/2 -translate-x-1/2 font-serif text-[1.35rem] tracking-[0.09em] lg:static lg:translate-x-0 lg:text-2xl",
              iconColor,
            )}
            aria-label="Swoosh home"
          >
            SWOOSH
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
            <Link
              to="/shop?filter=new"
              className={cn(
                "text-[12px] font-medium uppercase tracking-[0.13em] transition-opacity hover:opacity-65",
                iconColor,
              )}
            >
              New Arrivals
            </Link>
            {primaryCategories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className={cn(
                  "flex min-h-11 items-center text-[12px] font-medium uppercase tracking-[0.13em] transition-opacity hover:opacity-65",
                  iconColor,
                )}
              >
                {category.name}
              </Link>
            ))}
            <button
              type="button"
              aria-expanded={desktopMenu === "categories"}
              aria-controls="desktop-categories-menu"
              onClick={() =>
                setDesktopMenu((current) =>
                  current === "categories" ? null : "categories",
                )
              }
              className={cn(
                "flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-[0.13em]",
                iconColor,
              )}
            >
              Categories
              <ChevronDown
                className={cn(
                  "transition-transform",
                  desktopMenu === "categories" && "rotate-180",
                )}
                size={13}
              />
            </button>
            <button
              type="button"
              aria-expanded={desktopMenu === "collections"}
              aria-controls="desktop-collections-menu"
              onClick={() =>
                setDesktopMenu((current) =>
                  current === "collections" ? null : "collections",
                )
              }
              className={cn(
                "flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-[0.13em]",
                iconColor,
              )}
            >
              Collections
              <ChevronDown
                className={cn(
                  "transition-transform",
                  desktopMenu === "collections" && "rotate-180",
                )}
                size={13}
              />
            </button>
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link
              to="/shop"
              className="hidden min-h-11 min-w-11 place-items-center sm:grid"
              aria-label="Search products"
            >
              <Search size={19} className={iconColor} />
            </Link>
            <Link
              to="/wishlist"
              className="relative grid min-h-11 min-w-11 place-items-center"
              aria-label="Wishlist"
            >
              <Heart size={19} className={iconColor} />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              className="relative grid min-h-11 min-w-11 place-items-center"
              aria-label="Shopping bag"
            >
              <ShoppingBag size={19} className={iconColor} />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {desktopMenu && (
          <>
            <motion.button
              type="button"
              aria-label="Close shop menu"
              className="fixed inset-0 z-[55] hidden bg-black/20 lg:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDesktopMenu(null)}
            />
            <motion.section
              id={
                desktopMenu === "categories"
                  ? "desktop-categories-menu"
                  : "desktop-collections-menu"
              }
              className="fixed left-1/2 top-[72px] z-[60] hidden max-h-[calc(100vh-5.5rem)] w-[min(94vw,70rem)] -translate-x-1/2 overflow-y-auto border border-[#DDD8D0] bg-white text-[#1A1A1A] shadow-2xl lg:block"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {desktopMenu === "categories" ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#DDD8D0] px-6 py-4">
                    <div>
                      <p className="font-serif text-2xl text-[#1A1A1A]">
                        Shop categories
                      </p>
                      <p className="mt-1 text-xs text-[#6B6560]">
                        Browse departments and product types
                      </p>
                    </div>
                    <Link
                      to="/categories"
                      className="flex min-h-10 items-center gap-2 text-sm font-medium text-[#1A1A1A] underline underline-offset-4"
                    >
                      View all <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 md:grid-cols-3 xl:grid-cols-4">
                    {categories.map((category) => (
                      <div key={category.id} className="min-w-0">
                        <Link
                          to={`/shop?category=${category.slug}`}
                          className="flex min-h-10 items-center justify-between border-b border-[#DDD8D0] font-medium text-[#1A1A1A] hover:text-[#C44A2D]"
                        >
                          {category.name}
                          <span className="text-xs font-normal text-[#6B6560]">
                            {category._count?.products ?? 0}
                          </span>
                        </Link>
                        <div className="pt-2">
                          {category.children?.map((child) => (
                            <Link
                              key={child.id}
                              to={`/shop?category=${child.slug}`}
                              className="flex min-h-8 items-center justify-between text-sm text-[#6B6560] hover:text-[#1A1A1A]"
                            >
                              {child.name}
                              {(child._count?.products ?? 0) > 0 && (
                                <span className="text-xs">
                                  {child._count?.products}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-[#DDD8D0] px-6 py-4">
                    <p className="font-serif text-2xl text-[#1A1A1A]">
                      Collections
                    </p>
                    <p className="mt-1 text-xs text-[#6B6560]">
                      Curated edits from Swoosh
                    </p>
                  </div>
                  <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((collection) => (
                      <Link
                        key={collection.id}
                        to={`/collection/${collection.slug}`}
                        className="flex min-h-16 items-center justify-between border border-[#DDD8D0] bg-[#FAF8F4] px-4 text-sm font-medium text-[#1A1A1A] hover:border-[#1A1A1A]"
                      >
                        {collection.name}
                        <ArrowUpRight size={16} />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </motion.section>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-dark/45 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              id="mobile-navigation"
              aria-label="Mobile navigation"
              className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-xl lg:hidden"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
            >
              <Link
                to="/shop?filter=new"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-14 items-center justify-between border-b border-line font-serif text-2xl text-ink"
              >
                New Arrivals <ArrowUpRight size={17} className="text-muted" />
              </Link>
              <div className="py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                    Shop categories
                  </p>
                  <Link
                    to="/categories"
                    onClick={() => setMenuOpen(false)}
                    className="text-xs underline underline-offset-4"
                  >
                    View all
                  </Link>
                </div>
                {categories.map((category) => (
                  <div key={category.id} className="border-b border-line py-2">
                    <Link
                      to={`/shop?category=${category.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-10 items-center justify-between font-serif text-xl text-ink"
                    >
                      {category.name}
                      <span className="font-sans text-xs text-muted">
                        {category._count?.products ?? 0}
                      </span>
                    </Link>
                    {category.children?.length ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2">
                        {category.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/shop?category=${child.slug}`}
                            onClick={() => setMenuOpen(false)}
                            className="py-1 text-sm text-muted"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {collections.length > 0 && (
                <div className="border-b border-line py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                    Collections
                  </p>
                  {collections.map((collection) => (
                    <Link
                      key={collection.id}
                      to={`/collection/${collection.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-10 items-center justify-between text-sm text-ink"
                    >
                      {collection.name} <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  to="/wishlist"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 items-center justify-center gap-2 border border-line bg-background text-sm font-medium text-ink"
                >
                  <Heart size={17} /> Wishlist
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 items-center justify-center gap-2 bg-ink text-sm font-medium text-light"
                >
                  <Search size={17} /> Search
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
