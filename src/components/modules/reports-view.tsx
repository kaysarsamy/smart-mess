'use client'

// Reports module — monthly & yearly financial summaries with charts and
// admin-only month-close action. Uses recharts (client-side) and the
// cool blue/slate chart palette tokens (--chart-1..5).

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Loader2,
  Lock,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/shared/page-header'
import { SectionCard, DataBadge } from '@/components/shared/section-card'
import { StatCard } from '@/components/shared/stat-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EXPENSE_CATEGORY,
  PAYMENT_METHOD,
  expenseCategoryLabel,
  paymentMethodLabel,
  type ExpenseCategory,
  type PaymentMethod,
} from '@/lib/types'
import {
  formatBDT,
  formatDateTime,
  formatMonth,
  formatMonthFull,
  monthKey,
  previousMonth,
} from '@/lib/format'
import { cn } from '@/lib/utils'

// ---------- Types ----------
interface MonthlyReport {
  month: string
  rentBilled: number
  rentCollected: number
  rentDue: number
  expenseTotal: number
  net: number
  paymentMethods: Record<string, number>
  expensesByCategory: Record<string, number>
  otherInfo: {
    securityDepositTotal: number
    activeStudents: number
    occupiedSeats: number
    formerStudents: number
  }
  closed: boolean
  closedAt: string | null
}

interface YearlyMonth {
  month: string
  rentBilled: number
  rentCollected: number
  rentDue: number
  expenseTotal: number
}
interface YearlyReport {
  year: string
  months: YearlyMonth[]
  totals: {
    rentBilled: number
    rentCollected: number
    rentDue: number
    expenseTotal: number
  }
}

// ---------- Options ----------
const MONTH_OPTIONS: string[] = (() => {
  const out: string[] = []
  let k = monthKey()
  for (let i = 0; i < 12; i++) {
    out.push(k)
    k = previousMonth(k)
  }
  return out
})()

const YEAR_OPTIONS: string[] = (() => {
  const y = new Date().getFullYear()
  return [String(y), String(y - 1), String(y - 2)]
})()

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

// ============================================================
// Main view
// ============================================================
export default function ReportsView() {
  const [tab, setTab] = useState<'monthly' | 'yearly'>('monthly')
  const [month, setMonth] = useState<string>(monthKey())
  const [year, setYear] = useState<string>(YEAR_OPTIONS[0])

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Monthly and yearly financials." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'monthly' | 'yearly')}>
        <TabsList>
          <TabsTrigger value="monthly" className="gap-1.5">
            <BarChart3 className="size-4" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="yearly" className="gap-1.5">
            <TrendingUp className="size-4" /> Yearly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <MonthlySection month={month} onMonthChange={setMonth} />
        </TabsContent>
        <TabsContent value="yearly" className="mt-4">
          <YearlySection year={year} onYearChange={setYear} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Monthly section
// ============================================================
function MonthlySection({
  month,
  onMonthChange,
}: {
  month: string
  onMonthChange: (m: string) => void
}) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'

  const qc = useQueryClient()
  const monthlyQ = useQuery<MonthlyReport>({
    queryKey: ['reports', 'monthly', month],
    queryFn: async () => {
      const r = await fetch(`/api/reports/monthly?month=${month}`)
      if (!r.ok) throw new Error('Failed to load monthly report')
      return (await r.json()) as MonthlyReport
    },
  })

  const closeMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/reports/close-month?month=${month}`, {
        method: 'POST',
      })
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(e.error || 'Failed to close month')
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success(`Closed ${formatMonthFull(month)} successfully`)
      qc.invalidateQueries({ queryKey: ['reports', 'monthly', month] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const loading = monthlyQ.isLoading
  const data = monthlyQ.data

  return (
    <div className="space-y-6">
      {/* Month selector + admin close alert */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthFull(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && data && (
          <CloseStatusBadge closed={data.closed} closedAt={data.closedAt} />
        )}
      </div>

      {/* Admin close-month alert + button */}
      {isAdmin && data && (
        <SectionCard
          title="Month Review & Close"
          description="Lock the ledger for this month once you've reviewed the figures."
        >
          {data.closed ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Month closed</AlertTitle>
              <AlertDescription>
                {formatMonthFull(month)} was closed on{' '}
                {formatDateTime(data.closedAt)}. Figures below are frozen for
                reference.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Lock className="size-4" />
              <AlertTitle>Month open</AlertTitle>
              <AlertDescription>
                Review the figures below and close {formatMonthFull(month)} to
                lock the ledger. This action is recorded with your account.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4">
            <Button
              disabled={data.closed || closeMut.isPending}
              onClick={() => closeMut.mutate()}
            >
              {closeMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : data.closed ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
              {data.closed ? 'Month Closed' : 'Review & Close Month'}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Rent Billed"
          value={loading ? '' : formatBDT(data?.rentBilled)}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Collected"
          value={loading ? '' : formatBDT(data?.rentCollected)}
          hint={loading ? undefined : 'payments this month'}
          icon={<Wallet className="h-5 w-5" />}
          tone="positive"
          loading={loading}
        />
        <StatCard
          label="Due"
          value={loading ? '' : formatBDT(data?.rentDue)}
          hint={loading ? undefined : 'unpaid billed rent'}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
          loading={loading}
        />
        <StatCard
          label="Expenses"
          value={loading ? '' : formatBDT(data?.expenseTotal)}
          icon={<Wallet className="h-5 w-5" />}
          tone="warning"
          loading={loading}
        />
        <StatCard
          label="Net"
          value={loading ? '' : formatBDT(data?.net)}
          hint={
            loading
              ? undefined
              : (data?.net ?? 0) >= 0
                ? 'surplus'
                : 'deficit'
          }
          icon={
            (data?.net ?? 0) >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          tone={(data?.net ?? 0) >= 0 ? 'positive' : 'danger'}
          loading={loading}
          className="col-span-2 lg:col-span-3 xl:col-span-1"
        />
      </div>

      {/* Payment methods + Expenses by category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PaymentMethodsCard
          data={data}
          loading={loading}
        />
        <ExpensesByCategoryCard data={data} loading={loading} />
      </div>

      {/* Other info (ledger) */}
      <OtherInfoCard data={data} loading={loading} />
    </div>
  )
}

function CloseStatusBadge({
  closed,
  closedAt,
}: {
  closed: boolean
  closedAt: string | null
}) {
  if (closed) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <CheckCircle2 className="size-3" />
        Closed on {formatDateTime(closedAt)}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <Lock className="size-3" />
      Open
    </Badge>
  )
}

// ============================================================
// Payment methods card (bars + optional pie)
// ============================================================
function PaymentMethodsCard({
  data,
  loading,
}: {
  data?: MonthlyReport
  loading: boolean
}) {
  const rows = useMemo(() => {
    return (Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((m) => ({
      key: m,
      label: paymentMethodLabel[m],
      amount: data?.paymentMethods[m] ?? 0,
    }))
  }, [data])
  const maxMethod = Math.max(1, ...rows.map((r) => r.amount))
  const totalCollected = rows.reduce((s, r) => s + r.amount, 0)
  const pieData = rows
    .filter((r) => r.amount > 0)
    .map((r, i) => ({
      name: r.label,
      value: r.amount,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))

  return (
    <SectionCard
      title="Payment Methods"
      description={`Collected this month: ${formatBDT(totalCollected)}`}
    >
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBDT(r.amount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[var(--chart-1)]"
                    style={{
                      width: `${Math.max(4, (r.amount / maxMethod) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            {pieData.length === 0 ? (
              <EmptyChart label="No payments recorded this month" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatBDT(v)}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================
// Expenses by category card (bars + optional bar chart)
// ============================================================
function ExpensesByCategoryCard({
  data,
  loading,
}: {
  data?: MonthlyReport
  loading: boolean
}) {
  const rows = useMemo(() => {
    return (Object.keys(EXPENSE_CATEGORY) as ExpenseCategory[]).map((c) => ({
      key: c,
      label: expenseCategoryLabel[c],
      amount: data?.expensesByCategory[c] ?? 0,
    }))
  }, [data])
  const maxCat = Math.max(1, ...rows.map((r) => r.amount))
  const totalExpenses = rows.reduce((s, r) => s + r.amount, 0)
  const barData = rows
    .filter((r) => r.amount > 0)
    .map((r) => ({ name: r.label, amount: r.amount }))

  return (
    <SectionCard
      title="Expenses by Category"
      description={`Spent this month: ${formatBDT(totalExpenses)}`}
    >
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatBDT(r.amount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[var(--chart-3)]"
                    style={{
                      width: `${Math.max(4, (r.amount / maxCat) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            {barData.length === 0 ? (
              <EmptyChart label="No expenses recorded this month" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v: number) => formatBDT(v)}
                    cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="amount" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================
// Other info card
// ============================================================
function OtherInfoCard({
  data,
  loading,
}: {
  data?: MonthlyReport
  loading: boolean
}) {
  const rows = [
    { label: 'Security Deposits Total', value: data ? formatBDT(data.otherInfo.securityDepositTotal) : '' },
    { label: 'Active Students', value: data ? String(data.otherInfo.activeStudents) : '' },
    { label: 'Occupied Seats', value: data ? String(data.otherInfo.occupiedSeats) : '' },
    { label: 'Former Students', value: data ? String(data.otherInfo.formerStudents) : '' },
    { label: 'Meal Funds', value: '—', muted: true, note: 'tracked separately' },
  ]
  return (
    <SectionCard
      title="Other Information"
      description="Ledger context for this month."
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40',
                r.muted && 'opacity-80'
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {r.label}
                </p>
                {r.note && (
                  <p className="text-[11px] text-muted-foreground">{r.note}</p>
                )}
              </div>
              <DataBadge>{r.value}</DataBadge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================
// Yearly section
// ============================================================
function YearlySection({
  year,
  onYearChange,
}: {
  year: string
  onYearChange: (y: string) => void
}) {
  const yearlyQ = useQuery<YearlyReport>({
    queryKey: ['reports', 'yearly', year],
    queryFn: async () => {
      const r = await fetch(`/api/reports/yearly?year=${year}`)
      if (!r.ok) throw new Error('Failed to load yearly report')
      return (await r.json()) as YearlyReport
    },
  })

  const loading = yearlyQ.isLoading
  const data = yearlyQ.data

  const chartData = useMemo(() => {
    return (data?.months ?? []).map((m) => ({
      month: formatMonth(m.month),
      rentBilled: m.rentBilled,
      rentCollected: m.rentCollected,
      rentDue: m.rentDue,
      expenseTotal: m.expenseTotal,
    }))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          All amounts in BDT (৳).
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Rent Billed (YTD)"
          value={loading ? '' : formatBDT(data?.totals.rentBilled)}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Collected (YTD)"
          value={loading ? '' : formatBDT(data?.totals.rentCollected)}
          icon={<Wallet className="h-5 w-5" />}
          tone="positive"
          loading={loading}
        />
        <StatCard
          label="Due (YTD)"
          value={loading ? '' : formatBDT(data?.totals.rentDue)}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
          loading={loading}
        />
        <StatCard
          label="Expenses (YTD)"
          value={loading ? '' : formatBDT(data?.totals.expenseTotal)}
          icon={<Wallet className="h-5 w-5" />}
          tone="warning"
          loading={loading}
        />
      </div>

      {/* Yearly trend (AreaChart) */}
      <SectionCard
        title="Yearly Trend"
        description="Billed vs collected vs due across 12 months."
      >
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <EmptyChart label="No data for this year" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="gBilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gDue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v: number) => formatBDT(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="rentBilled"
                name="Rent Billed"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#gBilled)"
              />
              <Area
                type="monotone"
                dataKey="rentCollected"
                name="Collected"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#gCollected)"
              />
              <Area
                type="monotone"
                dataKey="rentDue"
                name="Due"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fill="url(#gDue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Monthly expenses BarChart */}
      <SectionCard
        title="Monthly Expenses"
        description="Expense total per month."
      >
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : chartData.length === 0 ? (
          <EmptyChart label="No data for this year" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v: number) => formatBDT(v)}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="expenseTotal" name="Expenses" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  )
}

// ============================================================
// Shared bits
// ============================================================
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <BarChart3 className="mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
