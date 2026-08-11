import * as React from "react"

export const Card = ({ className = "", ...props }) => (
  <div className={`rounded-2xl border border-brand bg-white shadow-xl shadow-slate-200/50 ${className}`} {...props} />
)

export const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-2 p-8 ${className}`} {...props} />
)

export const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`text-xl font-bold tracking-tight text-slate-900 ${className}`} {...props} />
)

export const CardDescription = ({ className = "", ...props }) => (
  <p className={`text-sm text-slate-500 leading-relaxed ${className}`} {...props} />
)

export const CardContent = ({ className = "", ...props }) => (
  <div className={`p-8 pt-0 ${className}`} {...props} />
)