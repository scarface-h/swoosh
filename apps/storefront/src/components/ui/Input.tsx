import * as React from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs uppercase tracking-wider font-sans font-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <span className="absolute left-3 text-muted">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-background border border-line text-ink placeholder:text-muted font-sans text-sm px-3 py-2.5 outline-none transition-colors duration-200 focus:border-ink",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-error focus:border-error text-error",
              className
            )}
            {...props}
          />
          {rightIcon && <span className="absolute right-3 text-muted">{rightIcon}</span>}
        </div>
        {error && <p className="text-xs text-error font-sans">{error}</p>}
        {hint && !error && <p className="text-xs text-muted font-sans">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
