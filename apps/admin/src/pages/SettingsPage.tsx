import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface SettingRecord {
  key: string;
  value: unknown;
  isPublic: boolean;
}

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("Swoosh Shop");
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    adminApiFetch<SettingRecord[]>("/admin/settings")
      .then((settings) => {
        const name = settings.find((item) => item.key === "store.name");
        const maintenance = settings.find((item) => item.key === "maintenance");
        if (typeof name?.value === "string") setStoreName(name.value);
        if (
          maintenance?.value &&
          typeof maintenance.value === "object" &&
          "active" in maintenance.value
        ) {
          const value = maintenance.value as {
            active: boolean;
            message?: string;
          };
          setMaintenanceActive(Boolean(value.active));
          setMaintenanceMessage(value.message ?? "");
        }
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Unable to load settings.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApiFetch("/admin/settings", {
        method: "PATCH",
        body: {
          settings: [
            { key: "store.name", value: storeName.trim(), isPublic: true },
            {
              key: "maintenance",
              value: {
                active: maintenanceActive,
                ...(maintenanceMessage.trim()
                  ? { message: maintenanceMessage.trim() }
                  : {}),
              },
              isPublic: true,
            },
          ],
        },
      });
      setMessage("Settings saved successfully.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to save settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (passwords.newPassword.length < 12) {
      setError("The new password must contain at least 12 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("The new password confirmation does not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await adminApiFetch("/admin/auth/change-password", {
        method: "POST",
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage(
        "Password changed. Sign out and sign in again with the new password.",
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to change the password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">Settings</h1>
      <form
        onSubmit={save}
        className="max-w-2xl space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-6"
      >
        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={17} className="animate-spin text-accent" />
            Loading settings…
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                {message}
              </div>
            )}
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Store name
              </span>
              <input
                required
                maxLength={160}
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <div className="border-t border-line pt-5">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={maintenanceActive}
                  onChange={(event) =>
                    setMaintenanceActive(event.target.checked)
                  }
                  className="h-4 w-4 accent-accent"
                />
                Enable maintenance notice
              </label>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm text-muted">
                  Customer-facing message
                </span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={maintenanceMessage}
                  onChange={(event) =>
                    setMaintenanceMessage(event.target.value)
                  }
                  className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving…" : "Save settings"}
            </button>
          </>
        )}
      </form>

      <form
        onSubmit={changePassword}
        className="mt-6 max-w-2xl space-y-5 rounded-xl border border-line bg-surface p-5 sm:p-6"
      >
        <div>
          <h2 className="text-lg font-medium text-ink">Change password</h2>
          <p className="mt-1 text-sm text-muted">
            Changing the password revokes all existing admin sessions.
          </p>
        </div>
        {[
          ["currentPassword", "Current password"],
          ["newPassword", "New password"],
          ["confirmPassword", "Confirm new password"],
        ].map(([key, label]) => (
          <label key={key}>
            <span className="mb-1.5 block text-sm font-medium">{label}</span>
            <input
              required
              type="password"
              minLength={key === "currentPassword" ? 1 : 12}
              autoComplete={
                key === "currentPassword" ? "current-password" : "new-password"
              }
              value={passwords[key as keyof typeof passwords]}
              onChange={(event) =>
                setPasswords((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={changingPassword}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {changingPassword && <Loader2 size={16} className="animate-spin" />}
          {changingPassword ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
