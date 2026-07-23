import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { apiFetch } from "@/lib/api";

export default function Layout() {
  const [maintenance, setMaintenance] = useState<{
    active: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    apiFetch<Record<string, unknown>>("/settings/public")
      .then((settings) => {
        const value = settings.maintenance;
        if (value && typeof value === "object" && "active" in value) {
          setMaintenance(value as { active: boolean; message?: string });
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <Header />
      {maintenance?.active ? (
        <main className="grid min-h-[100svh] place-items-center bg-background px-5 pt-20 text-center">
          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">
              Swoosh Shop
            </p>
            <h1 className="mt-4 font-serif text-4xl text-ink">
              We’ll be right back
            </h1>
            <p className="mt-4 leading-relaxed text-muted">
              {maintenance.message ||
                "The shop is receiving a quick update. Please check back shortly."}
            </p>
          </div>
        </main>
      ) : (
        <>
          <main className="min-h-screen">
            <Outlet />
          </main>
          <Footer />
        </>
      )}
    </>
  );
}
