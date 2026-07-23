import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, Heart, ShoppingBag, X, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

const navigation = [
  { label: "New Arrivals", href: "/shop?filter=new" },
  { label: "Men", href: "/shop?category=men" },
  { label: "Women", href: "/shop?category=women" },
  { label: "Accessories", href: "/shop?category=accessories" },
  { label: "Collections", href: "/collection/summer-essentials" },
  { label: "About", href: "/about" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const itemCount = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const openCart = useCartStore((s) => s.openCart);

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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          solid
            ? "border-b border-line bg-surface/95 shadow-[0_1px_0_rgba(20,20,20,0.02)] backdrop-blur-md"
            : "bg-gradient-to-b from-black/35 to-transparent"
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
            {menuOpen ? <X size={22} className="text-ink" /> : <Menu size={22} className={iconColor} />}
          </button>

          <Link
            to="/"
            className={cn(
              "absolute left-1/2 -translate-x-1/2 font-serif text-[1.35rem] tracking-[0.09em] lg:static lg:translate-x-0 lg:text-2xl",
              iconColor
            )}
            aria-label="Swoosh home"
          >
            SWOOSH
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {navigation.slice(0, 5).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-[12px] font-medium uppercase tracking-[0.13em] transition-opacity hover:opacity-65",
                  iconColor
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link
              to="/shop"
              className="hidden min-h-11 min-w-11 place-items-center sm:grid"
              aria-label="Search products"
            >
              <Search size={19} className={iconColor} />
            </Link>
            <Link to="/wishlist" className="relative grid min-h-11 min-w-11 place-items-center" aria-label="Wishlist">
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
              className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-xl lg:hidden"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
            >
              <div className="divide-y divide-line">
                {navigation.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 items-center justify-between font-serif text-2xl text-ink"
                  >
                    {link.label}
                    <ArrowUpRight size={17} className="text-muted" />
                  </Link>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
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
