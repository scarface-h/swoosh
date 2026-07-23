"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: <CheckCircle className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-error" />,
  info: <Info className="h-4 w-4 text-ink" />,
  warning: <AlertTriangle className="h-4 w-4 text-accent" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const toast = {
    success: (message: string) => add("success", message),
    error: (message: string) => add("error", message),
    info: (message: string) => add("info", message),
    warning: (message: string) => add("warning", message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex w-auto flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-80">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3 bg-background border border-line shadow-lg px-4 py-3",
              )}
            >
              <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
              <p className="flex-1 text-sm font-sans text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-muted hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
