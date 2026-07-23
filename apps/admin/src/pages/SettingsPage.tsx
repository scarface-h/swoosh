import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Store,
  Sun,
  Wrench,
} from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";
import { type AdminTheme, useUiStore } from "@/stores/uiStore";

interface SettingRecord {
  key: string;
  value: unknown;
  isPublic: boolean;
}

type Tab = "store" | "operations" | "security" | "appearance";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("store");
  const [storeName, setStoreName] = useState("Swoosh Shop");
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [delivery, setDelivery] = useState({
    insideCharge: 100,
    insideFreeAbove: 0,
    insideActive: true,
    outsideCharge: 150,
    outsideFreeAbove: 0,
    outsideActive: true,
    deliveryText: "Delivery across Bangladesh in 2–5 business days.",
    exchangeText: "Exchange requests are accepted according to the store policy.",
  });
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
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  useEffect(() => {
    adminApiFetch<SettingRecord[]>("/admin/settings")
      .then((settings) => {
        const name = settings.find((item) => item.key === "store.name");
        const maintenance = settings.find((item) => item.key === "maintenance");
        const inside = settings.find((item) => item.key === "delivery.dhaka_inside")?.value as
          | { charge?: number; freeAbove?: number; active?: boolean }
          | undefined;
        const outside = settings.find((item) => item.key === "delivery.outside_dhaka")?.value as
          | { charge?: number; freeAbove?: number; active?: boolean }
          | undefined;
        const policy = settings.find((item) => item.key === "policy.delivery_exchange")?.value as
          | { deliveryText?: string; exchangeText?: string }
          | undefined;
        setDelivery((current) => ({
          insideCharge: inside?.charge ?? current.insideCharge,
          insideFreeAbove: inside?.freeAbove ?? current.insideFreeAbove,
          insideActive: inside?.active ?? current.insideActive,
          outsideCharge: outside?.charge ?? current.outsideCharge,
          outsideFreeAbove: outside?.freeAbove ?? current.outsideFreeAbove,
          outsideActive: outside?.active ?? current.outsideActive,
          deliveryText: policy?.deliveryText ?? current.deliveryText,
          exchangeText: policy?.exchangeText ?? current.exchangeText,
        }));
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
            {
              key: "delivery.dhaka_inside",
              value: {
                charge: delivery.insideCharge,
                active: delivery.insideActive,
                ...(delivery.insideFreeAbove > 0 ? { freeAbove: delivery.insideFreeAbove } : {}),
              },
              isPublic: true,
            },
            {
              key: "delivery.outside_dhaka",
              value: {
                charge: delivery.outsideCharge,
                active: delivery.outsideActive,
                ...(delivery.outsideFreeAbove > 0 ? { freeAbove: delivery.outsideFreeAbove } : {}),
              },
              isPublic: true,
            },
            {
              key: "policy.delivery_exchange",
              value: {
                deliveryText: delivery.deliveryText,
                exchangeText: delivery.exchangeText,
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

  const tabs = [
    {
      id: "store" as const,
      label: "Store profile",
      description: "Name and identity",
      icon: Store,
    },
    {
      id: "operations" as const,
      label: "Operations",
      description: "Maintenance controls",
      icon: Wrench,
    },
    {
      id: "security" as const,
      label: "Security",
      description: "Password and sessions",
      icon: Shield,
    },
    {
      id: "appearance" as const,
      label: "Appearance",
      description: "Theme and navigation",
      icon: Palette,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,760px)]">
      <aside className="h-fit rounded-2xl border border-line bg-surface p-2 lg:sticky lg:top-28">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setError("");
              setMessage("");
            }}
            className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
              tab === item.id
                ? "bg-dark text-white"
                : "text-muted hover:bg-background hover:text-ink"
            }`}
          >
            <item.icon size={18} className="shrink-0" />
            <span>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  tab === item.id ? "text-white/50" : "text-muted"
                }`}
              >
                {item.description}
              </span>
            </span>
          </button>
        ))}
      </aside>

      <main>
        {error && (
          <div className="mb-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
            {message}
          </div>
        )}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm text-muted">
            <Loader2 size={17} className="animate-spin text-accent" />
            Loading settings…
          </div>
        ) : tab === "store" ? (
          <form
            onSubmit={save}
            className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-7"
          >
            <SettingsHeading
              title="Store profile"
              description="The public identity used across the storefront and admin."
            />
            <label>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Store name
              </span>
              <input
                required
                maxLength={160}
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="mt-1.5 block text-xs text-muted">
                Customers may see this name in storefront metadata and notices.
              </span>
            </label>
            <SaveButton saving={saving} />
          </form>
        ) : tab === "operations" ? (
          <form
            onSubmit={save}
            className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-7"
          >
            <SettingsHeading
              title="Store operations"
              description="Control customer-facing availability without changing product data."
            />
            <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-line bg-background p-4">
              <input
                type="checkbox"
                checked={maintenanceActive}
                onChange={(event) => setMaintenanceActive(event.target.checked)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Enable maintenance notice
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Display an operational message while preserving catalog and
                  order data.
                </span>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Customer-facing message
              </span>
              <textarea
                rows={5}
                maxLength={500}
                value={maintenanceMessage}
                onChange={(event) => setMaintenanceMessage(event.target.value)}
                placeholder="We are making improvements and will be back shortly."
                className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <span className="mt-1.5 block text-xs text-muted">
                {maintenanceMessage.length}/500 characters
              </span>
            </label>
            <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              {[
                ["inside", "Inside Dhaka"],
                ["outside", "Outside Dhaka"],
              ].map(([key, label]) => {
                const prefix = key === "inside" ? "inside" : "outside";
                const chargeKey = `${prefix}Charge` as "insideCharge" | "outsideCharge";
                const freeKey = `${prefix}FreeAbove` as "insideFreeAbove" | "outsideFreeAbove";
                const activeKey = `${prefix}Active` as "insideActive" | "outsideActive";
                return (
                  <fieldset key={key} className="rounded-xl border border-line p-4">
                    <legend className="px-2 text-sm font-semibold text-ink">{label}</legend>
                    <label className="mb-3 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={delivery[activeKey]} onChange={(event) =>
                        setDelivery((current) => ({ ...current, [activeKey]: event.target.checked }))
                      } />
                      Delivery available
                    </label>
                    <label className="block text-xs text-muted">Charge (BDT)
                      <input type="number" min={0} value={delivery[chargeKey]} onChange={(event) =>
                        setDelivery((current) => ({ ...current, [chargeKey]: Number(event.target.value) }))
                      } className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink" />
                    </label>
                    <label className="mt-3 block text-xs text-muted">Free delivery above (0 disables)
                      <input type="number" min={0} value={delivery[freeKey]} onChange={(event) =>
                        setDelivery((current) => ({ ...current, [freeKey]: Number(event.target.value) }))
                      } className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink" />
                    </label>
                  </fieldset>
                );
              })}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Delivery policy</span>
              <textarea rows={4} maxLength={10000} value={delivery.deliveryText}
                onChange={(event) => setDelivery((current) => ({ ...current, deliveryText: event.target.value }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Delivery & exchange policy</span>
              <textarea rows={5} maxLength={10000} value={delivery.exchangeText}
                onChange={(event) => setDelivery((current) => ({ ...current, exchangeText: event.target.value }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink" />
            </label>
            <SaveButton saving={saving} />
          </form>
        ) : tab === "security" ? (
          <form
            onSubmit={changePassword}
            className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-7"
          >
            <SettingsHeading
              title="Account security"
              description="Change the administrator password and revoke all existing sessions."
            />
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm leading-relaxed text-warning">
              Use at least 12 characters. After the change, sign in again on
              every device.
            </div>
            {[
              ["currentPassword", "Current password"],
              ["newPassword", "New password"],
              ["confirmPassword", "Confirm new password"],
            ].map(([key, fieldLabel]) => (
              <label key={key}>
                <span className="mb-1.5 block text-sm font-medium">
                  {fieldLabel}
                </span>
                <input
                  required
                  type="password"
                  minLength={key === "currentPassword" ? 1 : 12}
                  autoComplete={
                    key === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  value={passwords[key as keyof typeof passwords]}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={changingPassword}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-surface disabled:opacity-50"
            >
              {changingPassword && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {changingPassword ? "Changing…" : "Change password"}
            </button>
          </form>
        ) : (
          <section className="space-y-7 rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <SettingsHeading
              title="Admin appearance"
              description="Personal preferences are stored in this browser and do not affect customers."
            />
            <div>
              <p className="mb-3 text-sm font-medium text-ink">Color theme</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "light" as AdminTheme, label: "Light", icon: Sun },
                  { id: "dark" as AdminTheme, label: "Dark", icon: Moon },
                  {
                    id: "system" as AdminTheme,
                    label: "System",
                    icon: Monitor,
                  },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                      theme === option.id
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-line bg-background text-ink"
                    }`}
                  >
                    <option.icon size={21} />
                    {option.label}
                    {theme === option.id && (
                      <Check size={15} className="absolute right-2.5 top-2.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-line pt-6">
              <p className="mb-3 text-sm font-medium text-ink">
                Desktop navigation
              </p>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-background p-4">
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Compact sidebar
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Show icons only to create more working space.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={collapsed}
                  onChange={(event) =>
                    setSidebarCollapsed(event.target.checked)
                  }
                  className="h-4 w-4 accent-accent"
                />
              </label>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SettingsHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-line pb-5">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {saving ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Save size={16} />
      )}
      {saving ? "Saving…" : "Save settings"}
    </button>
  );
}
