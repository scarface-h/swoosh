import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const navigation = navItems.map((item) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
        )}
      >
        <item.icon size={18} />
        {item.label}
      </Link>
    );
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-dark text-white">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/" className="text-xl font-semibold tracking-wide">SWOOSH</Link>
          <p className="text-xs text-white/50 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-surface border-b border-line flex items-center px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="-ml-2 mr-2 flex h-11 w-11 items-center justify-center text-ink lg:hidden"
            aria-label="Open admin navigation"
          >
            <Menu size={22} />
          </button>
          <h2 className="text-sm font-medium text-muted">SWOOSH Admin</h2>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-dark text-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-5">
              <div>
                <Link to="/" className="text-lg font-semibold tracking-wide">SWOOSH</Link>
                <p className="text-xs text-white/50">Admin Panel</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label="Close admin navigation"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{navigation}</nav>
            <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-white/70"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
