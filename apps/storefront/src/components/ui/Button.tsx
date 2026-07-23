import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const variants = {
  primary: "bg-ink text-light hover:bg-ink/90",
  secondary: "bg-surface text-ink hover:bg-surface/80 border border-line",
  outline: "border border-ink text-ink hover:bg-ink hover:text-light",
  ghost: "text-ink hover:bg-surface",
  accent: "bg-accent text-light hover:bg-accent/90",
}

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  fullWidth?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, isLoading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-sans font-medium uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = "Button"

export { Button }
