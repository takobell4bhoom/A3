import * as React from "react"

export const Label = React.forwardRef(({ className = "", ...props }, ref) => (
  <label
    ref={ref}
    className={`text-sm font-medium leading-none text-slate-700 ${className}`}
    {...props}
  />
))
Label.displayName = "Label"