'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  Banknote,
  Calendar,
  Check,
  ChevronsUpDown,
  CreditCard,
  Loader2,
  Printer,
  Receipt,
  Search,
  User,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useUIStore } from '@/lib/ui-store'
import {
  PAYMENT_METHOD,
  paymentMethodLabel,
  type PaymentMethod,
} from '@/lib/types'
import {
  formatBDT,
  formatDate,
  formatDateTime,
  formatMonth,
  monthKey,
  previousMonth,
} from '@/lib/format'
import { cn } from '@/lib/utils'

/* ----------------------------- Types ----------------------------- */

interface StudentOption {
  id: string
  fullName: string
  phone?: string | null
  studentIdRef?: string | null
}

interface BillSummary {
  id: string
  studentId: string
  studentName: string
  month: string
  amount: number
  paid: number
  due: number
  dueDate: string
  createdAt: string
}

interface PaymentRow {
  id: string
  studentId: string
  studentName: string
  billId: string | null
  billMonth: string | null
  amount: number
  method: string
  txnRef: string | null
  payerName: string | null
  note: string | null
  receivedByName: string | null
  paidAt: string
}

interface ReceiptData {
  payment: {
    id: string
    amount: number
    method: string
    txnRef: string | null
    payerName: string | null
    note: string | null
    paidAt: string
  }
  student: {
    id: string
    fullName: string
    phone: string | null
    studentIdRef: string | null
  }
  bill: { id: string; month: string; amount: number } | null
  messName: string
  receivedByName: string | null
  receiptNo: string
}

interface DashboardSummary {
  rentBilledThisMonth?: number
  rentCollectedThisMonth?: number
  outstandingRent?: number
}

/* ----------------------------- Helpers ----------------------------- */

const METHOD_BADGE_CLASS: Record<string, string> = {
  CASH: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  BKASH: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-900',
  NAGAD: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900',
  BANK: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
}

function lastNMonths(n: number): string[] {
  const out: string[] = []
  let key = monthKey()
  for (let i = 0; i < n; i++) {
    out.push(key)
    key = previousMonth(key)
  }
  return out
}

function printReceipt(html: string) {
  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print the receipt.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 120)
}

function buildReceiptHtml(r: ReceiptData): string {
  const rows: string[] = []
  rows.push(`<tr><td>Receipt No</td><td>${r.receiptNo}</td></tr>`)
  rows.push(`<tr><td>Date</td><td>${formatDateTime(r.payment.paidAt)}</td></tr>`)
  rows.push(`<tr><td>Student</td><td>${escapeHtml(r.student.fullName)}</td></tr>`)
  if (r.student.phone) rows.push(`<tr><td>Phone</td><td>${escapeHtml(r.student.phone)}</td></tr>`)
  if (r.student.studentIdRef) rows.push(`<tr><td>ID Ref</td><td>${escapeHtml(r.student.studentIdRef)}</td></tr>`)
  if (r.bill) rows.push(`<tr><td>Bill Month</td><td>${formatMonth(r.bill.month)}</td></tr>`)
  rows.push(
    `<tr><td>Method</td><td>${paymentMethodLabel[r.payment.method as PaymentMethod] ?? r.payment.method}</td></tr>`
  )
  if (r.payment.txnRef) rows.push(`<tr><td>Txn Ref</td><td>${escapeHtml(r.payment.txnRef)}</td></tr>`)
  if (r.payment.payerName) rows.push(`<tr><td>Payer</td><td>${escapeHtml(r.payment.payerName)}</td></tr>`)
  if (r.receivedByName) rows.push(`<tr><td>Received By</td><td>${escapeHtml(r.receivedByName)}</td></tr>`)
  if (r.payment.note) rows.push(`<tr><td>Note</td><td>${escapeHtml(r.payment.note)}</td></tr>`)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${r.receiptNo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 28px; color: #0f172a; }
    .head { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 18px; }
    .head h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: 0.02em; }
    .head p { font-size: 11px; color: #64748b; margin: 0; letter-spacing: 0.18em; text-transform: uppercase; }
    .amt { font-size: 28px; font-weight: 700; text-align: center; margin: 16px 0 18px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 7px 0; vertical-align: top; }
    td:first-child { color: #64748b; width: 42%; }
    td:last-child { text-align: right; font-weight: 600; }
    .foot { margin-top: 28px; padding-top: 14px; border-top: 2px dashed #94a3b8; text-align: center; font-size: 10px; color: #94a3b8; letter-spacing: 0.06em; }
  </style></head><body>
    <div class="head">
      <h1>${escapeHtml(r.messName)}</h1>
      <p>Payment Receipt</p>
    </div>
    <div class="amt">${formatBDT(r.payment.amount)}</div>
    <table>
      ${rows.join('\n      ')}
    </table>
    <div class="foot">
      Thank you. This is a system-generated receipt.
    </div>
  </body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ----------------------------- Component ----------------------------- */

export default function BillingView() {
  const qc = useQueryClient()
  const pendingPayment = useUIStore((s) => s.pendingPayment)
  const clearPendingPayment = useUIStore((s) => s.clearPendingPayment)

  // Record Payment dialog state
  const [recordOpen, setRecordOpen] = useState(false)
  const [studentId, setStudentId] = useState<string>('')
  const [month, setMonth] = useState<string>(monthKey())
  // null = "user hasn't typed" → fall back to bill's due (derived below).
  const [userAmount, setUserAmount] = useState<string | null>(null)
  const [method, setMethod] = useState<string>(PAYMENT_METHOD.CASH)
  const [txnRef, setTxnRef] = useState<string>('')
  const [payerName, setPayerName] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [studentComboOpen, setStudentComboOpen] = useState(false)

  // Inline generate-bill amount (when no bill exists)
  const [generateAmount, setGenerateAmount] = useState<string>('')

  // Receipt dialog state
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const months = useMemo(() => lastNMonths(6), [])

  /* -------- Queries -------- */

  const studentsQuery = useQuery<{ students: StudentOption[] }>({
    queryKey: ['students', 'ACTIVE'],
    queryFn: async () => {
      const res = await fetch('/api/students?status=ACTIVE')
      if (!res.ok) throw new Error('Failed to load students')
      return res.json()
    },
  })
  const students = studentsQuery.data?.students ?? []

  const paymentsQuery = useQuery<{ payments: PaymentRow[] }>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await fetch('/api/payments')
      if (!res.ok) throw new Error('Failed to load payments')
      return res.json()
    },
  })
  const payments = paymentsQuery.data?.payments ?? []

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/summary')
      if (!res.ok) throw new Error('Failed to load summary')
      return res.json()
    },
  })

  // Bill lookup for selected student+month (enabled only when both set)
  const billQuery = useQuery<{ bills: BillSummary[] }>({
    queryKey: ['bill', studentId, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/bills?studentId=${encodeURIComponent(studentId)}&month=${encodeURIComponent(month)}`
      )
      if (!res.ok) throw new Error('Failed to load bill')
      return res.json()
    },
    enabled: !!studentId && !!month,
  })
  const bill = billQuery.data?.bills?.[0] ?? null

  // Derived amount: user input takes precedence; otherwise fall back to the
  // bill's due (so selecting a student+month pre-fills the amount field).
  const amount =
    userAmount ?? (bill ? String(bill.due > 0 ? bill.due : bill.amount) : '')

  // Receipt data fetch (when receiptId is set)
  const receiptQuery = useQuery<ReceiptData>({
    queryKey: ['receipt', receiptId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/${receiptId}/receipt`)
      if (!res.ok) throw new Error('Failed to load receipt')
      return res.json()
    },
    enabled: !!receiptId,
  })

  /* -------- Mutations -------- */

  const recordMutation = useMutation({
    mutationFn: async (payload: {
      studentId: string
      billId: string | null
      amount: number
      method: string
      txnRef?: string | null
      payerName?: string | null
      note?: string | null
    }) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'RECORD_FAILED')
      return data.payment as { id: string }
    },
    onSuccess: (payment) => {
      toast.success('Payment recorded')
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['bill'] })
      setRecordOpen(false)
      resetForm()
      setReceiptId(payment.id)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Could not record payment')
    },
  })

  const generateBillMutation = useMutation({
    mutationFn: async (payload: {
      studentId: string
      month: string
      amount: number
    }) => {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'BILL_CREATE_FAILED')
      return data.bill as BillSummary
    },
    onSuccess: (createdBill) => {
      toast.success('Bill generated')
      qc.invalidateQueries({ queryKey: ['bill', studentId, month] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      // Reset user input so the amount field picks up the new bill's due.
      setUserAmount(String(createdBill.due > 0 ? createdBill.due : createdBill.amount))
      setGenerateAmount('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Could not generate bill')
    },
  })

  /* -------- Effects -------- */

  // Consume pendingPayment coming from the dashboard "Collect" action.
  // This is a genuine external-event subscription (Zustand store → side
  // effect), so setState-in-effect is the right pattern here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pendingPayment) {
      setStudentId(pendingPayment.studentId)
      setMonth(pendingPayment.month)
      setMethod(PAYMENT_METHOD.CASH)
      setUserAmount(null)
      setRecordOpen(true)
      clearPendingPayment()
    }
  }, [pendingPayment, clearPendingPayment])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* -------- Handlers -------- */

  function resetForm() {
    setStudentId('')
    setMonth(monthKey())
    setUserAmount(null)
    setMethod(PAYMENT_METHOD.CASH)
    setTxnRef('')
    setPayerName('')
    setNote('')
    setGenerateAmount('')
  }

  function openRecord() {
    resetForm()
    setRecordOpen(true)
  }

  function onSubmit() {
    if (!studentId) {
      toast.error('Select a student')
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (method !== PAYMENT_METHOD.CASH && !txnRef.trim()) {
      toast.error('Transaction reference is required for non-cash methods')
      return
    }
    recordMutation.mutate({
      studentId,
      billId: bill?.id ?? null,
      amount: amt,
      method,
      txnRef: txnRef.trim() || null,
      payerName: payerName.trim() || null,
      note: note.trim() || null,
    })
  }

  function onGenerateBill() {
    const amt = Number(generateAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid bill amount')
      return
    }
    generateBillMutation.mutate({ studentId, month, amount: amt })
  }

  const selectedStudent = students.find((s) => s.id === studentId)
  const billLoading = !!studentId && !!month && billQuery.isLoading
  const isNonCash = method !== PAYMENT_METHOD.CASH

  /* -------- Render -------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Payments"
        description="Record payments and print receipts."
        actions={
          <Button onClick={openRecord}>
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Rent Billed (This Month)"
          value={summaryQuery.data ? formatBDT(summaryQuery.data.rentBilledThisMonth ?? 0) : '—'}
          loading={summaryQuery.isLoading}
          icon={<Wallet className="h-5 w-5" />}
          tone="info"
          hint={`For ${formatMonth(monthKey())}`}
        />
        <StatCard
          label="Collected (This Month)"
          value={summaryQuery.data ? formatBDT(summaryQuery.data.rentCollectedThisMonth ?? 0) : '—'}
          loading={summaryQuery.isLoading}
          icon={<Banknote className="h-5 w-5" />}
          tone="positive"
        />
        <StatCard
          label="Outstanding Rent"
          value={summaryQuery.data ? formatBDT(summaryQuery.data.outstandingRent ?? 0) : '—'}
          loading={summaryQuery.isLoading}
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      {/* Recent payments */}
      <SectionCard
        title="Recent Payments"
        description="Latest 50 transactions across all students."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => paymentsQuery.refetch()}
            disabled={paymentsQuery.isFetching}
          >
            <Receipt className="h-4 w-4" />
            Refresh
          </Button>
        }
        contentClassName="p-0"
      >
        <div className="max-h-96 overflow-y-auto scroll-slim">
          {paymentsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No payments yet"
                description="Record your first payment to see it listed here."
                icon={<Receipt className="h-6 w-6" />}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60 dark:bg-slate-900/40">
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Txn Ref</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 text-muted-foreground">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.studentName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.billMonth ? formatMonth(p.billMonth) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBDT(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-medium',
                          METHOD_BADGE_CLASS[p.method] ?? METHOD_BADGE_CLASS.CASH
                        )}
                      >
                        {paymentMethodLabel[p.method as PaymentMethod] ?? p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.txnRef ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.receivedByName ?? '—'}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReceiptId(p.id)}
                      >
                        <Printer className="h-4 w-4" />
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

      {/* Record Payment Dialog */}
      <Dialog
        open={recordOpen}
        onOpenChange={(o) => {
          setRecordOpen(o)
          if (!o) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Collect rent from a student and print a receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[65vh] gap-4 overflow-y-auto scroll-slim pr-1">
            {/* Student */}
            <div className="grid gap-2">
              <Label>
                <User className="h-4 w-4" />
                Student
              </Label>
              <Popover open={studentComboOpen} onOpenChange={setStudentComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {studentsQuery.isLoading
                        ? 'Loading students…'
                        : selectedStudent
                          ? selectedStudent.fullName
                          : 'Select student…'}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, phone, ID…" />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.fullName} ${s.phone ?? ''} ${s.studentIdRef ?? ''}`}
                            onSelect={() => {
                              setStudentId(s.id)
                              setStudentComboOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'h-4 w-4',
                                studentId === s.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{s.fullName}</span>
                              {(s.phone || s.studentIdRef) && (
                                <span className="text-xs text-muted-foreground">
                                  {s.studentIdRef ? `ID ${s.studentIdRef}` : ''}
                                  {s.studentIdRef && s.phone ? ' · ' : ''}
                                  {s.phone ? s.phone : ''}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Month */}
            <div className="grid gap-2">
              <Label>
                <Calendar className="h-4 w-4" />
                Billing Month
              </Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonth(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bill summary / generate-bill inline */}
            {!studentId ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 p-3 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">
                Select a student and month to view their bill.
              </div>
            ) : billLoading ? (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : bill ? (
              <div className="grid grid-cols-3 gap-2">
                <SummaryField label="Billed" value={formatBDT(bill.amount)} />
                <SummaryField label="Paid" value={formatBDT(bill.paid)} tone="positive" />
                <SummaryField
                  label="Due"
                  value={formatBDT(bill.due)}
                  tone={bill.due > 0 ? 'danger' : 'default'}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs text-muted-foreground">
                  No bill generated for {formatMonth(month)}. Enter the monthly rent to
                  generate one.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Bill amount (৳)"
                    value={generateAmount}
                    onChange={(e) => setGenerateAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={onGenerateBill}
                    disabled={generateBillMutation.isPending}
                  >
                    {generateBillMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                    Generate Bill
                  </Button>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount Received</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ৳
                </span>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setUserAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Method */}
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <RadioGroup
                value={method}
                onValueChange={setMethod}
                className="grid grid-cols-4 gap-2"
              >
                {(
                  [
                    PAYMENT_METHOD.CASH,
                    PAYMENT_METHOD.BKASH,
                    PAYMENT_METHOD.NAGAD,
                    PAYMENT_METHOD.BANK,
                  ] as PaymentMethod[]
                ).map((m) => (
                  <Label
                    key={m}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1 rounded-md border px-2 py-2 text-center text-xs transition-colors',
                      method === m
                        ? 'border-ring bg-accent/60 text-foreground'
                        : 'border-input hover:bg-accent/40'
                    )}
                  >
                    <RadioGroupItem value={m} className="sr-only" />
                    <span
                      className={cn(
                        'inline-flex h-2 w-2 rounded-full',
                        METHOD_BADGE_CLASS[m].split(' ')[0],
                        METHOD_BADGE_CLASS[m].split(' ')[1]
                      )}
                    />
                    <span className="font-medium">
                      {paymentMethodLabel[m]}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Non-cash fields */}
            {isNonCash && (
              <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="grid gap-2">
                  <Label htmlFor="txnRef">
                    Transaction Reference <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="txnRef"
                    placeholder="e.g. TXN9F2K7B / Cheque #1234"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payerName">Payer Name (optional)</Label>
                  <Input
                    id="payerName"
                    placeholder="Name of the person who paid"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Note */}
            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Any note about this payment…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Security deposits are tracked separately under each student&apos;s profile — do
                not record them here.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecordOpen(false)
                resetForm()
              }}
              disabled={recordMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Save &amp; Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={!!receiptId}
        onOpenChange={(o) => {
          if (!o) setReceiptId(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Review the receipt and print when ready.
            </DialogDescription>
          </DialogHeader>

          {receiptQuery.isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : receiptQuery.data ? (
            <ReceiptCard data={receiptQuery.data} />
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load receipt.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptId(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (receiptQuery.data) {
                  printReceipt(buildReceiptHtml(receiptQuery.data))
                }
              }}
              disabled={!receiptQuery.data}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ----------------------------- Sub-components ----------------------------- */

function SummaryField({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'danger'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-foreground'
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-0.5 text-sm font-semibold', toneClass)}>{value}</p>
    </div>
  )
}

function ReceiptCard({ data }: { data: ReceiptData }) {
  const {
    messName,
    receiptNo,
    payment,
    student,
    bill,
    receivedByName,
  } = data

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 font-mono text-sm dark:border-slate-700 dark:bg-slate-900/40">
      <div className="border-b border-dashed border-slate-300 pb-3 text-center dark:border-slate-600">
        <p className="text-base font-semibold tracking-tight">{messName}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Payment Receipt
        </p>
      </div>

      <div className="my-3 text-center">
        <p className="text-2xl font-bold">{formatBDT(payment.amount)}</p>
      </div>

      <dl className="grid grid-cols-1 gap-y-1.5 text-[13px]">
        <Row label="Receipt No" value={receiptNo} />
        <Row label="Date" value={formatDateTime(payment.paidAt)} />
        <Row label="Student" value={student.fullName} />
        {student.phone && <Row label="Phone" value={student.phone} />}
        {student.studentIdRef && (
          <Row label="ID Ref" value={student.studentIdRef} />
        )}
        {bill && <Row label="Bill Month" value={formatMonth(bill.month)} />}
        <Row
          label="Method"
          value={paymentMethodLabel[payment.method as PaymentMethod] ?? payment.method}
        />
        {payment.txnRef && <Row label="Txn Ref" value={payment.txnRef} />}
        {payment.payerName && <Row label="Payer" value={payment.payerName} />}
        {receivedByName && <Row label="Received By" value={receivedByName} />}
        {payment.note && <Row label="Note" value={payment.note} />}
      </dl>

      <p className="mt-4 border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-muted-foreground dark:border-slate-600">
        Thank you. This is a system-generated receipt.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
