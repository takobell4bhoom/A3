import { forwardRef } from "react"

export const Button = forwardRef(({ className = "", variant = "primary", children, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer";
  
  const variants = {
    primary: "bg-brand-primary text-white bg-brand-primary-hover focus:ring-slate-900",
    accent: "bg-brand-accent text-white bg-brand-accent-hover focus:ring-emerald-600",
    outline: "border border-brand text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-400"
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
Button.displayName = "Button"