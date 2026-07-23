import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  KeyRound,
  Package,
  Settings,
  ShoppingCart,
} from "lucide-react";

export default function HelpDeskPage() {
  const guides = [
    {
      title: "Product and inventory help",
      description:
        "Create products, manage variants, upload images, adjust stock, or archive records.",
      href: "/products",
      icon: Package,
    },
    {
      title: "Order operations",
      description:
        "Move orders through valid fulfillment states and review customer details.",
      href: "/orders",
      icon: ShoppingCart,
    },
    {
      title: "Store configuration",
      description:
        "Update store identity, maintenance controls, appearance, and security.",
      href: "/settings",
      icon: Settings,
    },
    {
      title: "Administrator access",
      description:
        "Create role-based accounts, suspend access, and manage temporary credentials.",
      href: "/users",
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-dark p-6 text-white sm:p-8">
        <BookOpen size={26} className="text-white/50" />
        <h2 className="mt-4 text-2xl font-semibold">Swoosh operations guide</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Shortcuts to the real administrative tools available in this
          workspace. Permission-protected pages remain limited by each
          administrator&apos;s assigned role.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            to={guide.href}
            className="group rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
              <guide.icon size={19} />
            </span>
            <h3 className="mt-4 font-semibold text-ink">{guide.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {guide.description}
            </p>
            <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-accent">
              Open tool{" "}
              <ArrowRight
                size={15}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
