import { create } from "zustand";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  setAccessToken,
} from "@/lib/api";

type AuthStatus = "idle" | "checking" | "authenticated" | "guest";

interface AuthState {
  status: AuthStatus;
  permissions: string[];
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  permissions: [],

  initialize: async () => {
    if (get().status !== "idle") return;
    set({ status: "checking" });

    try {
      const session = await refreshAdminSession();
      set({ status: "authenticated", permissions: session.permissions });
    } catch {
      setAccessToken(null);
      set({ status: "guest", permissions: [] });
    }
  },

  login: async (email, password) => {
    const session = await loginAdmin(email.trim().toLowerCase(), password);
    set({ status: "authenticated", permissions: session.permissions });
  },

  logout: async () => {
    try {
      await logoutAdmin();
    } finally {
      set({ status: "guest", permissions: [] });
    }
  },
}));
