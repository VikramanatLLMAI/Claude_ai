import * as React from "react"

interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div>
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground px-6 pt-4">
          {description}
        </p>
      )}
    </div>
  )
}
