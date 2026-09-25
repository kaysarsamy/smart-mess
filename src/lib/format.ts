// Formatting helpers — currency in BDT, dates in Asia/Dhaka.

export function formatBDT(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  return `৳ ${value.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-BD')
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  })
}

/** "YYYY-MM" key from a Date or from year+month ints. */
export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Pretty month label, e.g. "Sep 2026". */
export function formatMonth(key: string): string {
  if (!key) return '—'
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** Pretty month label full, e.g. "September 2026". */
export function formatMonthFull(key: string): string {
  if (!key) return '—'
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Previous month key from "YYYY-MM". */
export function previousMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return monthKey(d)
}

export function statusTone(status: string): {
  label: string
  className: string
} {
  const map: Record<string, { label: string; className: string }> = {
    PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' },
    PARTIAL: { label: 'Partial', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900' },
    DUE: { label: 'Due', className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900' },
    OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900' },
    ACTIVE: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' },
    FORMER: { label: 'Former', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700' },
    AVAILABLE: { label: 'Available', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' },
    OCCUPIED: { label: 'Occupied', className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900' },
  }
  return map[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700' }
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Convert a Date to yyyy-mm-dd for <input type="date">. */
export function toDateInputValue(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return tz.toISOString().slice(0, 10)
}
