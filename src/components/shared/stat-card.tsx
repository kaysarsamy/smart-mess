'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  tone?: 'default' | 'positive' | 'warning' | 'danger' | 'info'
  loading?: boolean
  className?: string
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  loading,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden border-slate-200/70 dark:border-slate-800', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 truncate text-2xl font-semibold text-foreground">{value}</p>
            )}
            {hint && !loading && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                toneStyles[tone]
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
