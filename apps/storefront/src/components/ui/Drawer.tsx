"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  side?: "left" | "right"
  children: React.ReactNode
  className?: string
}

export function Drawer({ isOpen, onClose, title, side = "right", children, className }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [isOpen, onClose])

  const slideFrom = side === "right" ? { x: "100%" } : { x: "-100%" }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/50"
            onClick={onClose}
          />
          <motion.div
            initial={slideFrom}
            animate={{ x: 0 }}
            exit={slideFrom}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "relative z-10 flex flex-col w-full max-w-md bg-background h-full shadow-xl",
              side === "right" ? "ml-auto" : "mr-auto",
              className
            )}
          >
            <div className="flex items-center justify-between p-6 border-b border-line">
              {title && <h2 className="font-serif text-xl text-ink">{title}</h2>}
              <button onClick={onClose} className="ml-auto text-muted hover:text-ink transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
