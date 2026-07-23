import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedRoute() {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status === "idle" || status === "checking") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
