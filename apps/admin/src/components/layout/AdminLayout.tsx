import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Command,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

const navigationGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Store management",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Catalog", href: "/catalog", icon: FolderTree },
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

const allNavigation = navigationGroups.flatMap((group) => group.items);

const pageDetails: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Store performance and operational overview",
  },
  "/products": {
    title: "Products",
    description: "Manage products, inventory and storefront placement",
  },
  "/catalog": {
    title: "Catalog",
    description: "Organize categories and curated collections",
  },
  "/orders": {
    title: "Orders",
    description: "Review fulfillment, payments and order status",
  },
  "/customers": {
    title: "Customers",
    description: "Customer accounts and purchase activity",
  },
  "/settings": {
    title: "Settings",
    description: "Store operations, appearance and account security",
  },
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const logout = useAuthStore((state) => state.logout);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const page =
    pageDetails[
      Object.keys(pageDetails)
        .filter((key) => key === "/" || pathname.startsWith(key))
        .sort((a, b) => b.length - a.length)[0] ?? "/"
    ];

  useEffect(() => {
    setMobileNavOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen, searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 20);
  }, [searchOpen]);

  const filteredNavigation = useMemo(
    () =>
      allNavigation.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const navigation = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {navigationGroups.map((group) => (
        <section key={group.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex min-h-11 items-center rounded-xl text-sm transition",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-[#ffffff] text-[#17191e] shadow-sm"
                      : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className="shrink-0"
                  />
                  {!collapsed && (
                    <span className="truncate font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/5 bg-dark text-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-[5.25rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex min-h-20 items-center border-b border-white/10",
            collapsed ? "justify-center px-3" : "justify-between px-5",
          )}
        >
          <Link to="/" className="min-w-0">
            <span
              className={cn(
                "block font-semibold tracking-[0.14em]",
                collapsed ? "text-lg" : "text-xl",
              )}
            >
              {collapsed ? "S" : "SWOOSH"}
            </span>
            {!collapsed && (
              <span className="mt-0.5 block text-[11px] text-white/45">
                Commerce Admin
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="grid h-10 w-10 place-items-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>
        {navigation}
        <div className="border-t border-white/10 p-3">
          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="mb-2 grid h-11 w-full place-items-center rounded-xl text-white/60 hover:bg-white/10"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex min-h-11 w-full items-center rounded-xl text-sm text-white/55 hover:bg-white/5 hover:text-white",
              collapsed ? "justify-center" : "gap-3 px-3",
            )}
          >
            <LogOut size={18} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
          <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-ink lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu size={21} />
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-background px-3 text-left text-sm text-muted sm:max-w-md"
            >
              <Search size={17} />
              <span className="truncate">Search admin pages…</span>
              <span className="ml-auto hidden items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[10px] sm:flex">
                <Command size={11} /> K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-background hover:text-ink"
                aria-label={isDark ? "Use light theme" : "Use dark theme"}
              >
                {isDark ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((open) => !open);
                    setProfileOpen(false);
                  }}
                  className="relative grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-background hover:text-ink"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={19} />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-14 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-4 shadow-2xl">
                    <p className="font-semibold text-ink">Operations center</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <Link
                        to="/orders"
                        className="block rounded-xl bg-background p-3 text-ink hover:ring-1 hover:ring-line"
                      >
                        Review orders awaiting fulfillment
                      </Link>
                      <Link
                        to="/products"
                        className="block rounded-xl bg-background p-3 text-ink hover:ring-1 hover:ring-line"
                      >
                        Check inventory and draft products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setNotificationsOpen(false);
                  }}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 text-left hover:bg-background sm:px-2"
                  aria-expanded={profileOpen}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent">
                    <CircleUserRound size={20} />
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-xs font-semibold text-ink">
                      Store administrator
                    </span>
                    <span className="block text-[11px] text-muted">
                      Swoosh Shop
                    </span>
                  </span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-14 w-56 rounded-2xl border border-line bg-surface p-2 shadow-2xl">
                    <Link
                      to="/settings"
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-background"
                    >
                      <Settings size={17} /> Account settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-error hover:bg-error/5"
                    >
                      <LogOut size={17} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Swoosh commerce
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {page.title}
              </h1>
              <p className="mt-1 text-sm text-muted">{page.description}</p>
            </div>
            <Outlet />
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-dark text-white shadow-2xl">
            <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-5">
              <div>
                <p className="text-xl font-semibold tracking-[0.14em]">
                  SWOOSH
                </p>
                <p className="text-[11px] text-white/45">Commerce Admin</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10"
                aria-label="Close admin navigation"
              >
                <X size={21} />
              </button>
            </div>
            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
              {navigationGroups.map((group) => (
                <section key={group.label}>
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm",
                            active
                              ? "bg-[#ffffff] text-[#17191e]"
                              : "text-white/65",
                          )}
                        >
                          <item.icon size={18} /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
            <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/65"
              >
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setSearchOpen(false)}
            aria-label="Close admin search"
          />
          <section className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={19} className="text-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, orders, catalog or settings…"
                className="min-h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="grid h-10 w-10 place-items-center text-muted"
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredNavigation.length ? (
                filteredNavigation.map((item) => (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => {
                      navigate(item.href);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-background"
                  >
                    <item.icon size={18} className="text-muted" />
                    <span>{item.label}</span>
                    <ChevronRight size={16} className="ml-auto text-muted" />
                  </button>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted">
                  No admin page matches “{query}”.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
