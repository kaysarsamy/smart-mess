'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SectionCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn('border-slate-200/70 dark:border-slate-800', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </Card>
  )
}

interface DataBadgeProps {
  children: React.ReactNode
  className?: string
}

export function DataBadge({ children, className }: DataBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        className
      )}
    >
      {children}
    </Badge>
  )
}
