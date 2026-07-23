import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const initialize = useAuthStore((state) => state.initialize);
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      const previousLocation = (
        location.state as {
          from?: { pathname?: string; search?: string; hash?: string };
        } | null
      )?.from;
      const destination = previousLocation?.pathname
        ? `${previousLocation.pathname}${previousLocation.search ?? ""}${previousLocation.hash ?? ""}`
        : "/";
      navigate(destination, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === "ACCOUNT_LOCKED") {
          setError("This account is temporarily locked. Please try again in 15 minutes.");
        } else if (caught.status === 401) {
          setError("The email or password is incorrect.");
        } else if (caught.status === 429) {
          setError("Too many attempts. Please wait before trying again.");
        } else {
          setError(caught.message);
        }
      } else {
        setError("Unable to reach the server. Check that the API is running.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-ink text-light">
            <LockKeyhole size={20} />
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-wide">SWOOSH</h1>
          <p className="text-sm text-muted mt-1">Admin Panel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm"
        >
          {error && (
            <div
              className="rounded-lg border border-error/20 bg-error/5 px-3 py-2.5 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@swoosh.com"
              required
              autoComplete="username"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full px-3 py-2 pr-12 border border-line rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-11 w-full items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
