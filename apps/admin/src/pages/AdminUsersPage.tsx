import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { adminApiFetch, ApiError } from "@/lib/api";

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt: string | null;
  roles: Array<{ role: Role }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleIds: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        adminApiFetch<AdminUser[]>("/admin/users"),
        adminApiFetch<Role[]>("/admin/roles"),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to load administrator accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminApiFetch("/admin/users", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          roleIds: form.roleIds,
        },
      });
      setForm({ name: "", email: "", password: "", roleIds: [] });
      setNotice("Administrator created successfully.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to create administrator.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: AdminUser) => {
    setUpdating(user.id);
    setError("");
    try {
      await adminApiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: { status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
      });
      setNotice(
        user.status === "ACTIVE"
          ? `${user.name} was suspended and their sessions were revoked.`
          : `${user.name} was reactivated.`,
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to update administrator.",
      );
    } finally {
      setUpdating("");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="font-semibold text-ink">Administrator accounts</h2>
            <p className="mt-1 text-xs text-muted">
              Role-based access to the Swoosh admin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="grid h-11 w-11 place-items-center rounded-xl border border-line"
            aria-label="Refresh administrator accounts"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {error && (
          <div className="m-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {notice && (
          <div className="m-4 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
            {notice}
          </div>
        )}
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={17} className="animate-spin text-accent" />
            Loading administrators…
          </div>
        ) : (
          <div className="divide-y divide-line">
            {users.map((user) => (
              <article
                key={user.id}
                className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.3fr)_1fr_auto] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <UserCog size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map(({ role }) => (
                      <span
                        key={role.id}
                        className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold text-muted"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {user.lastLoginAt
                      ? `Last login ${new Date(user.lastLoginAt).toLocaleString("en-BD")}`
                      : "Has not signed in yet"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={updating === user.id}
                  onClick={() => void toggleStatus(user)}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50 ${
                    user.status === "ACTIVE"
                      ? "border-error/20 text-error"
                      : "border-success/20 text-success"
                  }`}
                >
                  {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={createUser}
        className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5 xl:sticky xl:top-28"
      >
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Plus size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Add administrator</h2>
            <p className="text-xs text-muted">Assign least-privilege roles.</p>
          </div>
        </div>
        {[
          ["name", "Full name", "text"],
          ["email", "Email address", "email"],
          ["password", "Temporary password", "password"],
        ].map(([key, fieldLabel, type]) => (
          <label key={key}>
            <span className="mb-1.5 block text-sm font-medium text-ink">
              {fieldLabel}
            </span>
            <input
              required
              type={type}
              minLength={key === "password" ? 12 : 2}
              value={form[key as "name" | "email" | "password"]}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className="min-h-11 w-full rounded-xl border border-line bg-background px-3 text-sm"
            />
          </label>
        ))}
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Roles</p>
          <div className="space-y-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-background p-3"
              >
                <input
                  type="checkbox"
                  checked={form.roleIds.includes(role.id)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleIds: event.target.checked
                        ? [...current.roleIds, role.id]
                        : current.roleIds.filter((id) => id !== role.id),
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-accent"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheck size={14} /> {role.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {role.description ?? role.code}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs leading-relaxed text-warning">
          <KeyRound size={15} className="mb-1" />
          Share temporary passwords securely and require the user to change them
          after sign-in.
        </div>
        <button
          type="submit"
          disabled={saving || form.roleIds.length === 0}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Create administrator
        </button>
      </form>
    </div>
  );
}
