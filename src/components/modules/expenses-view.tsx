'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Wallet,
  Plus,
  Trash2,
  Zap,
  Flame,
  Droplet,
  Wifi,
  Users,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import {
  formatBDT,
  formatDate,
  formatMonth,
  monthKey,
  toDateInputValue,
} from '@/lib/format'
import {
  EXPENSE_CATEGORY,
  type ExpenseCategory,
  expenseCategoryLabel,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type ExpenseRow = {
  id: string
  category: string
  amount: number
  incurredOn: string
  note: string
  createdByName: string
  createdAt: string
}

interface AddForm {
  category: ExpenseCategory
  amount: string
  incurredOn: string
  note: string
}

const CATEGORIES: ExpenseCategory[] = [
  EXPENSE_CATEGORY.ELECTRICITY,
  EXPENSE_CATEGORY.GAS,
  EXPENSE_CATEGORY.WATER,
  EXPENSE_CATEGORY.INTERNET,
  EXPENSE_CATEGORY.SALARY,
  EXPENSE_CATEGORY.OTHERS,
]

interface CategoryMeta {
  icon: React.ReactNode
  badge: string
  bar: string
  text: string
}

const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  ELECTRICITY: {
    icon: <Zap className="h-3.5 w-3.5" />,
    badge:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
    bar: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
  },
  GAS: {
    icon: <Flame className="h-3.5 w-3.5" />,
    badge:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    bar: 'bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  WATER: {
    icon: <Droplet className="h-3.5 w-3.5" />,
    badge:
      'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900',
    bar: 'bg-cyan-400',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  INTERNET: {
    icon: <Wifi className="h-3.5 w-3.5" />,
    badge:
      'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900',
    bar: 'bg-violet-400',
    text: 'text-violet-700 dark:text-violet-300',
  },
  SALARY: {
    icon: <Users className="h-3.5 w-3.5" />,
    badge:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
    bar: 'bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  OTHERS: {
    icon: <MoreHorizontal className="h-3.5 w-3.5" />,
    badge:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
    bar: 'bg-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
  },
}

function asCategory(c: string): ExpenseCategory {
  return (CATEGORIES as string[]).includes(c)
    ? (c as ExpenseCategory)
    : EXPENSE_CATEGORY.OTHERS
}

function defaultForm(): AddForm {
  return {
    category: EXPENSE_CATEGORY.ELECTRICITY,
    amount: '',
    incurredOn: toDateInputValue(),
    note: '',
  }
}

export default function ExpensesView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AddForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useQuery<{ expenses: ExpenseRow[] }>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await fetch('/api/expenses')
      if (!res.ok) throw new Error('Failed to load expenses')
      return res.json()
    },
  })

  const expenses = data?.expenses ?? []

  const thisMonthKey = monthKey()

  const monthExpenses = useMemo(
    () =>
      expenses.filter((e) => monthKey(e.incurredOn) === thisMonthKey),
    [expenses, thisMonthKey]
  )

  const categoryTotals = useMemo(() => {
    const map = {
      [EXPENSE_CATEGORY.ELECTRICITY]: 0,
      [EXPENSE_CATEGORY.GAS]: 0,
      [EXPENSE_CATEGORY.WATER]: 0,
      [EXPENSE_CATEGORY.INTERNET]: 0,
      [EXPENSE_CATEGORY.SALARY]: 0,
      [EXPENSE_CATEGORY.OTHERS]: 0,
    } as Record<ExpenseCategory, number>
    for (const e of monthExpenses) {
      map[asCategory(e.category)] += e.amount
    }
    return map
  }, [monthExpenses])

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const maxCategory = Math.max(
    1,
    ...CATEGORIES.map((c) => categoryTotals[c])
  )

  const createMutation = useMutation({
    mutationFn: async (payload: {
      category: string
      amount: number
      incurredOn: string
      note?: string
    }) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? 'Failed to add expense')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Expense recorded')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setOpen(false)
      setForm(defaultForm())
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? 'Failed to delete')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Expense deleted')
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit() {
    if (submitting) return
    const amount = Number(form.amount)
    if (!form.category || !form.amount || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Please fill category, amount, and date')
      return
    }
    if (!form.incurredOn) {
      toast.error('Please pick a date')
      return
    }
    setSubmitting(true)
    createMutation.mutate(
      {
        category: form.category,
        amount,
        incurredOn: form.incurredOn,
        note: form.note.trim() || undefined,
      },
      { onSettled: () => setSubmitting(false) }
    )
  }

  function openAdd() {
    setForm(defaultForm())
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Utilities and operating costs."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      <StatCard
        label="Total This Month"
        value={formatBDT(monthTotal)}
        hint={
          monthExpenses.length === 0
            ? 'No entries this month'
            : `${monthExpenses.length} ${monthExpenses.length === 1 ? 'entry' : 'entries'}`
        }
        icon={<Wallet className="h-5 w-5" />}
        tone="danger"
        loading={isLoading}
      />

      <SectionCard
        title="This Month"
        description={`Breakdown by category for ${formatMonth(thisMonthKey)}`}
      >
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : monthTotal === 0 ? (
          <EmptyState
            title="No expenses this month"
            description="Add your first expense to see the breakdown."
            icon={<Wallet className="h-6 w-6" />}
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c]
              const amt = categoryTotals[c]
              const pct = Math.round((amt / maxCategory) * 100)
              return (
                <div
                  key={c}
                  className="rounded-lg border border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800',
                          meta.text
                        )}
                      >
                        {meta.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {expenseCategoryLabel[c]}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatBDT(amt)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                    <div
                      className={cn('h-full rounded-full transition-all', meta.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recent Expenses"
        description="Latest 100 entries, newest first."
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            description="Track mess utilities and operating costs here."
            icon={<Wallet className="h-6 w-6" />}
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="scroll-slim max-h-96 overflow-auto rounded-md border border-slate-200/70 dark:border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => {
                      const c = asCategory(e.category)
                      const meta = CATEGORY_META[c]
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(e.incurredOn)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('gap-1', meta.badge)}
                            >
                              {meta.icon}
                              {expenseCategoryLabel[c]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatBDT(e.amount)}
                          </TableCell>
                          <TableCell
                            className="max-w-48 truncate text-muted-foreground"
                            title={e.note || undefined}
                          >
                            {e.note || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {e.createdByName}
                          </TableCell>
                          <TableCell>
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  aria-label={`Delete ${expenseCategoryLabel[c]} expense`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete expense?"
                              description={`This will remove ${formatBDT(e.amount)} for ${expenseCategoryLabel[c]}. This action cannot be undone.`}
                              confirmLabel="Delete"
                              onConfirm={async () => {
                                await deleteMutation.mutateAsync(e.id)
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile stacked cards */}
            <div className="space-y-3 md:hidden">
              {expenses.map((e) => {
                const c = asCategory(e.category)
                const meta = CATEGORY_META[c]
                return (
                  <div
                    key={e.id}
                    className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge
                          variant="outline"
                          className={cn('gap-1', meta.badge)}
                        >
                          {meta.icon}
                          {expenseCategoryLabel[c]}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(e.incurredOn)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatBDT(e.amount)}
                      </p>
                    </div>
                    {e.note && (
                      <p className="mt-2 break-words text-sm text-foreground">
                        {e.note}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                      <p className="text-xs text-muted-foreground">
                        By {e.createdByName}
                      </p>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        }
                        title="Delete expense?"
                        description={`This will remove ${formatBDT(e.amount)} for ${expenseCategoryLabel[c]}.`}
                        confirmLabel="Delete"
                        onConfirm={async () => {
                          await deleteMutation.mutateAsync(e.id)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a utility or operating cost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exp-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as ExpenseCategory }))
                }
              >
                <SelectTrigger id="exp-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {expenseCategoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount (BDT)</Label>
              <Input
                id="exp-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Date Incurred</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.incurredOn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, incurredOn: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-note">Note (optional)</Label>
              <Textarea
                id="exp-note"
                placeholder="e.g. Monthly electricity bill"
                rows={3}
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
