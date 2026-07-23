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

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [collections, setCollections] = useState<PublicCollection[]>([]);
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
    Promise.all([
      apiFetch<PublicCategory[]>("/categories"),
      apiFetch<PublicCollection[]>("/collections"),
    ])
      .then(([nextCategories, nextCollections]) => {
        setCategories(nextCategories);
        setCollections(nextCollections);
      })
      .catch(() => {
        setCategories([]);
        setCollections([]);
      });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
              <div key={category.id} className="group relative">
                <Link
                  to={`/shop?category=${category.slug}`}
                  className={cn(
                    "flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-[0.13em] transition-opacity hover:opacity-65",
                    iconColor,
                  )}
                >
                  {category.name}
                  {Boolean(category.children?.length) && <ChevronDown size={13} />}
                </Link>
                {Boolean(category.children?.length) && (
                  <div className="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="border border-line bg-surface p-3 shadow-xl">
                      <Link
                        to={`/shop?category=${category.slug}`}
                        className="flex min-h-10 items-center border-b border-line px-2 text-sm font-medium text-ink"
                      >
                        Shop all {category.name}
                      </Link>
                      {category.children?.map((child) => (
                        <Link
                          key={child.id}
                          to={`/shop?category=${child.slug}`}
                          className="flex min-h-10 items-center justify-between px-2 text-sm text-muted hover:bg-background hover:text-ink"
                        >
                          {child.name}
                          <span className="text-xs">{child._count?.products ?? 0}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="group relative">
              <Link
                to="/categories"
                className={cn(
                  "flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-[0.13em]",
                  iconColor,
                )}
              >
                Categories <ChevronDown size={13} />
              </Link>
              <div className="invisible absolute left-1/2 top-full w-[34rem] -translate-x-1/2 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="grid grid-cols-3 gap-x-5 gap-y-2 border border-line bg-surface p-5 shadow-xl">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <Link
                        to={`/shop?category=${category.slug}`}
                        className="flex min-h-9 items-center text-sm font-medium text-ink hover:text-accent"
                      >
                        {category.name}
                      </Link>
                      {category.children?.slice(0, 4).map((child) => (
                        <Link
                          key={child.id}
                          to={`/shop?category=${child.slug}`}
                          className="block py-1 text-xs text-muted hover:text-ink"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="group relative">
              <button
                type="button"
                className={cn(
                  "flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-[0.13em]",
                  iconColor,
                )}
              >
                Collections <ChevronDown size={13} />
              </button>
              <div className="invisible absolute right-0 top-full w-64 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="border border-line bg-surface p-3 shadow-xl">
                  {collections.length ? (
                    collections.map((collection) => (
                      <Link
                        key={collection.id}
                        to={`/collection/${collection.slug}`}
                        className="flex min-h-11 items-center justify-between px-2 text-sm text-ink hover:bg-background"
                      >
                        {collection.name}
                        <ArrowUpRight size={14} className="text-muted" />
                      </Link>
                    ))
                  ) : (
                    <Link
                      to="/shop"
                      className="flex min-h-11 items-center px-2 text-sm text-ink"
                    >
                      Browse all products
                    </Link>
                  )}
                </div>
              </div>
            </div>
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
