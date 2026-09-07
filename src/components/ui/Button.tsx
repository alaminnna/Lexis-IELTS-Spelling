import * as React from "react"
import { cn } from "@/utils/cn"
import { uiSound } from "@/services/uiSound"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "subtle"
type Size = "sm" | "md" | "lg" | "icon"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantCls: Record<Variant, string> = {
  primary: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-sm border-transparent",
  secondary: "bg-[hsl(var(--muted))] text-foreground hover:bg-[hsl(var(--muted)/0.9)] border-transparent",
  ghost: "bg-transparent hover:bg-[hsl(var(--muted))] text-foreground border-transparent",
  outline: "bg-transparent border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-foreground",
  subtle: "bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] text-foreground border-[hsl(var(--border))]",
}

const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-9 px-4 text-[13.5px] rounded-md",
  lg: "h-11 px-6 text-[15px] rounded-xl",
  icon: "h-9 w-9 p-0 rounded-md",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, onClick, onMouseEnter, ...props }, ref) => {
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (disabled || loading) return
      // premium tactile: every button press
      uiSound.click()
      onClick?.(e)
    }
    const handleEnter: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      onMouseEnter?.(e)
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseEnter={handleEnter}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-[500] tracking-[-0.01em] border transition-all duration-150 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:translate-y-[1px] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0",
          "hover:shadow-sm",
          variantCls[variant],
          sizeCls[size],
          className
        )}
        {...props}
      >
        {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
