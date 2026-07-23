import { cn } from "@/lib/utils"

const variants = {
  default: "bg-ink text-light",
  sale: "bg-accent text-light",
  new: "bg-ink text-light",
  soldOut: "bg-muted text-light",
  success: "bg-success text-light",
}

interface BadgeProps {
  variant?: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-1 text-[10px] uppercase tracking-widest font-sans font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
