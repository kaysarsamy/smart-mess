'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  UserPlus,
  Search,
  MoreVertical,
  Pencil,
  Armchair,
  LogOut,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Loader2,
  Inbox,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { SectionCard, DataBadge } from '@/components/shared/section-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import {
  formatBDT,
  formatDate,
  formatMonth,
  statusTone,
  initials,
  toDateInputValue,
} from '@/lib/format'
import { STUDENT_STATUS, paymentMethodLabel } from '@/lib/types'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface ListCurrentSeat {
  id: string
  roomId: string
  roomName: string
  seatLabel: string
  monthlyRent: number
  moveInDate: string
}

interface ListBalance {
  billed: number
  paid: number
  due: number
}

interface ListStudent {
  id: string
  fullName: string
  phone: string | null
  studentIdRef: string | null
  institution: string | null
  status: string
  currentSeat: ListCurrentSeat | null
  balance: ListBalance | null
}

interface ProfileStudent {
  id: string
  fullName: string
  phone: string | null
  studentIdRef: string | null
  email: string | null
  guardianName: string | null
  guardianPhone: string | null
  presentAddress: string | null
  permanentAddress: string | null
  institution: string | null
  status: string
  securityDeposit: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ProfileCurrentSeat {
  id: string
  seatId: string
  roomId: string
  roomName: string
  seatLabel: string
  monthlyRent: number
  moveInDate: string
  moveOutDate: string | null
}

interface SeatHistoryItem {
  id: string
  roomId: string
  roomName: string
  seatLabel: string
  monthlyRent: number
  moveInDate: string
  moveOutDate: string | null
  active: boolean
}

interface StudentProfile {
  student: ProfileStudent
  currentSeat: ProfileCurrentSeat | null
  seatHistory: SeatHistoryItem[]
  balance: { month: string; billed: number; paid: number; due: number } | null
  ledgerSummary: { totalBilled: number; totalPaid: number; totalDue: number }
}

interface LedgerEntry {
  id: string
  type: 'bill' | 'payment'
  date: string
  month?: string
  amount: number
  method?: string
  txnRef?: string
  note?: string
  balanceAfter: number
}

interface AvailableSeat {
  seatId: string
  label: string
  roomName: string
  roomId: string
  defaultRent: number
}

/* -------------------------------------------------------------------------- */
/* Form schema                                                                 */
/* -------------------------------------------------------------------------- */

const studentSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  studentIdRef: z.string().optional(),
  email: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  presentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  institution: z.string().optional(),
  securityDeposit: z.number().min(0),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof studentSchema>

const EMPTY_FORM: FormValues = {
  fullName: '',
  phone: '',
  studentIdRef: '',
  email: '',
  guardianName: '',
  guardianPhone: '',
  presentAddress: '',
  permanentAddress: '',
  institution: '',
  securityDeposit: 0,
  notes: '',
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function balanceKey(balance: ListBalance | null | undefined): string | null {
  if (!balance) return null
  if (balance.due <= 0) return 'PAID'
  if (balance.paid > 0) return 'PARTIAL'
  return 'DUE'
}

function BalanceBadge({ balance }: { balance: ListBalance | null }) {
  const key = balanceKey(balance)
  if (!key) return <span className="text-xs text-muted-foreground">—</span>
  const tone = statusTone(key)
  return (
    <Badge variant="outline" className={cn('border', tone.className)}>
      {tone.label}
    </Badge>
  )
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

function StudentFormFields({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = form
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" required error={errors.fullName?.message}>
        <Input placeholder="Rahim Uddin" {...register('fullName')} />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <Input placeholder="01XXXXXXXXX" {...register('phone')} />
      </Field>
      <Field label="Student ID ref" error={errors.studentIdRef?.message}>
        <Input placeholder="CSE-2026-001" {...register('studentIdRef')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input
          type="email"
          placeholder="rahim@example.com"
          {...register('email')}
        />
      </Field>
      <Field label="Institution" error={errors.institution?.message}>
        <Input placeholder="University / College" {...register('institution')} />
      </Field>
      <Field label="Guardian name" error={errors.guardianName?.message}>
        <Input placeholder="Father / Mother" {...register('guardianName')} />
      </Field>
      <Field label="Guardian phone" error={errors.guardianPhone?.message}>
        <Input placeholder="01XXXXXXXXX" {...register('guardianPhone')} />
      </Field>
      <Field label="Security deposit (৳)" error={errors.securityDeposit?.message}>
        <Input
          type="number"
          min={0}
          step="any"
          {...register('securityDeposit', {
            setValueAs: (v) =>
              v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v),
          })}
        />
      </Field>
      <Field
        label="Present address"
        className="sm:col-span-2"
        error={errors.presentAddress?.message}
      >
        <Textarea
          rows={2}
          placeholder="Current address"
          {...register('presentAddress')}
        />
      </Field>
      <Field
        label="Permanent address"
        className="sm:col-span-2"
        error={errors.permanentAddress?.message}
      >
        <Textarea
          rows={2}
          placeholder="Permanent address"
          {...register('permanentAddress')}
        />
      </Field>
      <Field
        label="Notes"
        className="sm:col-span-2"
        error={errors.notes?.message}
      >
        <Textarea rows={2} placeholder="Any notes…" {...register('notes')} />
      </Field>
    </div>
  )
}

function toPayload(values: FormValues) {
  return {
    fullName: values.fullName.trim(),
    phone: values.phone?.trim() || null,
    studentIdRef: values.studentIdRef?.trim() || null,
    email: values.email?.trim() || null,
    guardianName: values.guardianName?.trim() || null,
    guardianPhone: values.guardianPhone?.trim() || null,
    presentAddress: values.presentAddress?.trim() || null,
    permanentAddress: values.permanentAddress?.trim() || null,
    institution: values.institution?.trim() || null,
    securityDeposit: values.securityDeposit,
    notes: values.notes?.trim() || null,
  }
}

/** Best-effort extraction of available seats from a /api/rooms response. */
function extractAvailableSeats(data: unknown): AvailableSeat[] {
  const out: AvailableSeat[] = []
  const rooms = (data as { rooms?: unknown[] } | null)?.rooms
  if (!Array.isArray(rooms)) return out
  for (const r of rooms) {
    const room = r as Record<string, unknown>
    const seats = room.seats
    const roomName = (room.name as string) ?? 'Room'
    const roomId = (room.id as string) ?? ''
    const roomRent =
      (room.monthlyRent as number | undefined) ??
      (room.defaultRent as number | undefined) ??
      0
    if (!Array.isArray(seats)) continue
    for (const s of seats) {
      const seat = s as Record<string, unknown>
      const occupied =
        seat.occupied === true ||
        !!seat.currentAssignment ||
        !!seat.assignment ||
        !!seat.occupant ||
        !!seat.student
      if (occupied) continue
      out.push({
        seatId: (seat.id as string) ?? '',
        label: (seat.label as string) ?? '?',
        roomName,
        roomId,
        defaultRent:
          (seat.monthlyRent as number | undefined) ?? roomRent ?? 0,
      })
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Main view                                                                   */
/* -------------------------------------------------------------------------- */

type StatusTab = 'ACTIVE' | 'FORMER' | 'ALL'

export default function StudentsView() {
  const queryClient = useQueryClient()
  const { wantAddStudent, consumeAddStudent } = useUIStore()

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('ACTIVE')

  const [profileId, setProfileId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [changeSeatOpen, setChangeSeatOpen] = useState(false)

  /* ----- debounce search input (300ms) ----- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  /* ----- consume cross-module "want add student" intent ----- */
  // The dashboard's "Add Student" quick-action sets wantAddStudent=true and
  // switches to this module; here we react by opening the Add dialog and
  // clearing the intent. This is a one-time cross-module side effect.
  useEffect(() => {
    if (wantAddStudent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddOpen(true)
      consumeAddStudent()
    }
  }, [wantAddStudent, consumeAddStudent])

  /* ----- queries ----- */
  const listQuery = useQuery({
    queryKey: ['students', debouncedQ, statusTab],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedQ) params.set('q', debouncedQ)
      if (statusTab !== 'ALL') params.set('status', statusTab)
      const res = await fetch(`/api/students?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load students')
      return (await res.json()) as { students: ListStudent[] }
    },
  })

  const profileQuery = useQuery({
    queryKey: ['student', profileId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${profileId}`)
      if (!res.ok) throw new Error('Failed to load student profile')
      return (await res.json()) as StudentProfile
    },
    enabled: !!profileId,
  })

  const ledgerQuery = useQuery({
    queryKey: ['student-ledger', profileId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${profileId}/ledger`)
      if (!res.ok) throw new Error('Failed to load ledger')
      return (await res.json()) as { entries: LedgerEntry[] }
    },
    enabled: !!profileId,
  })

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(values)),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? 'Failed to create student'
        )
      }
      return data
    },
    onSuccess: () => {
      toast.success('Student added.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setAddOpen(false)
      addForm.reset(EMPTY_FORM)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch(`/api/students/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(values)),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? 'Failed to update student'
        )
      }
      return data
    },
    onSuccess: () => {
      toast.success('Student updated.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', profileId] })
      queryClient.invalidateQueries({ queryKey: ['student-ledger', profileId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/students/${profileId}/checkout`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? 'Failed to check out student'
        )
      }
      return data
    },
    onSuccess: () => {
      toast.success('Student checked out.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', profileId] })
      queryClient.invalidateQueries({ queryKey: ['student-ledger', profileId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /* ----- forms ----- */
  const addForm = useForm<FormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: EMPTY_FORM,
  })

  const editForm = useForm<FormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: EMPTY_FORM,
  })

  // Pre-fill the edit form when the profile drawer is open & profile loaded.
  useEffect(() => {
    if (editOpen && profileQuery.data) {
      const s = profileQuery.data.student
      editForm.reset({
        fullName: s.fullName,
        phone: s.phone ?? '',
        studentIdRef: s.studentIdRef ?? '',
        email: s.email ?? '',
        guardianName: s.guardianName ?? '',
        guardianPhone: s.guardianPhone ?? '',
        presentAddress: s.presentAddress ?? '',
        permanentAddress: s.permanentAddress ?? '',
        institution: s.institution ?? '',
        securityDeposit: s.securityDeposit ?? 0,
        notes: s.notes ?? '',
      })
    }
  }, [editOpen, profileQuery.data, editForm])

  /* ----- change seat ----- */
  const roomsQuery = useQuery({
    queryKey: ['rooms-for-seat-picker'],
    queryFn: async () => {
      const res = await fetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to load rooms')
      return (await res.json()) as unknown
    },
    enabled: changeSeatOpen,
  })

  const availableSeats = useMemo(
    () => extractAvailableSeats(roomsQuery.data),
    [roomsQuery.data]
  )

  const [seatPick, setSeatPick] = useState<string>('')
  const [seatMoveIn, setSeatMoveIn] = useState<string>(toDateInputValue())
  const [seatRent, setSeatRent] = useState<string>('')

  // Helper: open the change-seat dialog (resets transient fields).
  function openChangeSeat() {
    setSeatPick('')
    setSeatMoveIn(toDateInputValue())
    setSeatRent('')
    setChangeSeatOpen(true)
  }

  // When a seat is picked in the Select, default the rent input to that
  // seat's defaultRent. Done in the onValueChange handler (no effect needed).
  function handleSeatPick(value: string) {
    setSeatPick(value)
    const seat = availableSeats.find((s) => s.seatId === value)
    if (seat) setSeatRent(String(seat.defaultRent || ''))
  }

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!seatPick) throw new Error('Please choose a seat.')
      const rentNum = Number(seatRent)
      if (!Number.isFinite(rentNum) || rentNum < 0) {
        throw new Error('Enter a valid monthly rent.')
      }
      const res = await fetch(`/api/seats/${seatPick}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profileId,
          moveInDate: new Date(seatMoveIn).toISOString(),
          monthlyRent: rentNum,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? 'Failed to assign seat'
        )
      }
      return data
    },
    onSuccess: () => {
      toast.success('Seat assigned.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', profileId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-for-seat-picker'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setChangeSeatOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  const students = listQuery.data?.students ?? []
  const isLoading = listQuery.isLoading
  const isEmpty = !isLoading && students.length === 0
  const profile = profileQuery.data
  const ledger = ledgerQuery.data?.entries ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Active and former residents."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        }
      />

      {/* Controls: search + status tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone or ID…"
            className="pl-9"
          />
        </div>
        <Tabs
          value={statusTab}
          onValueChange={(v) => setStatusTab(v as StatusTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="ACTIVE" className="flex-1 sm:flex-none">
              Active
            </TabsTrigger>
            <TabsTrigger value="FORMER" className="flex-1 sm:flex-none">
              Former
            </TabsTrigger>
            <TabsTrigger value="ALL" className="flex-1 sm:flex-none">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          title={
            q ? 'No matching students' : statusTab === 'ACTIVE' ? 'No active students' : 'No students found'
          }
          description={
            q
              ? `Try a different search term.`
              : 'Add your first student to get started.'
          }
          icon={<Users className="h-6 w-6" />}
          action={
            !q ? (
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add Student
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Desktop table */}
      {students.length > 0 && (
        <div className="hidden sm:block">
          <SectionCard contentClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>This month</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => setProfileId(s.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="bg-slate-200 dark:bg-slate-700">
                          <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            {initials(s.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.studentIdRef || 'No ID'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.phone || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.institution || '—'}
                    </TableCell>
                    <TableCell>
                      {s.currentSeat ? (
                        <DataBadge>
                          {s.currentSeat.roomName} · {s.currentSeat.seatLabel}
                        </DataBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.balance ? (
                        <div className="flex flex-col gap-0.5">
                          <BalanceBadge balance={s.balance} />
                          <span className="text-xs text-muted-foreground">
                            {formatBDT(s.balance.due)} due
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No bill this month
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setProfileId(s.id)}>
                              View profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProfileId(s.id)
                                setEditOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProfileId(s.id)
                                openChangeSeat()
                              }}
                            >
                              <Armchair className="h-4 w-4" />
                              Change seat
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setProfileId(s.id)
                              }}
                              className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40"
                            >
                              <LogOut className="h-4 w-4" />
                              Check out
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </div>
      )}

      {/* Mobile card list */}
      {students.length > 0 && (
        <div className="grid gap-3 sm:hidden">
          {students.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setProfileId(s.id)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-slate-200 dark:bg-slate-700">
                    <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {initials(s.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {s.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.studentIdRef || s.phone || 'No ID'}
                    </p>
                  </div>
                </div>
                <BalanceBadge balance={s.balance} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Institution</span>
                <span className="truncate text-right font-medium">
                  {s.institution || '—'}
                </span>
                <span className="text-muted-foreground">Seat</span>
                <span className="truncate text-right font-medium">
                  {s.currentSeat
                    ? `${s.currentSeat.roomName} · ${s.currentSeat.seatLabel}`
                    : '—'}
                </span>
                <span className="text-muted-foreground">Due</span>
                <span className="text-right font-medium">
                  {s.balance ? formatBDT(s.balance.due) : '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ---------------- Profile drawer (Sheet) ---------------- */}
      <Sheet
        open={!!profileId}
        onOpenChange={(open) => {
          if (!open) setProfileId(null)
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-md lg:max-w-xl"
        >
          <SheetHeader className="border-b border-slate-200 p-5 dark:border-slate-800">
            {profileQuery.isLoading ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-20 animate-pulse rounded" />
                </div>
              </div>
            ) : profile ? (
              <div className="flex items-center gap-3 pr-8">
                <Avatar className="h-12 w-12 bg-slate-200 dark:bg-slate-700">
                  <AvatarFallback className="bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {initials(profile.student.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg">
                    {profile.student.fullName}
                  </SheetTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={statusTone(profile.student.status).className}
                    >
                      {statusTone(profile.student.status).label}
                    </Badge>
                    {profile.student.studentIdRef && (
                      <DataBadge>{profile.student.studentIdRef}</DataBadge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <SheetTitle>Student</SheetTitle>
            )}
            <SheetDescription className="sr-only">
              Student profile and ledger
            </SheetDescription>
          </SheetHeader>

          {profile && (
            <div className="scroll-slim max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
              {/* Personal info */}
              <SectionCard title="Personal information" className="mb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={profile.student.phone || '—'}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={profile.student.email || '—'}
                  />
                  <InfoRow
                    label="Institution"
                    value={profile.student.institution || '—'}
                  />
                  <InfoRow
                    label="Student ID"
                    value={profile.student.studentIdRef || '—'}
                  />
                  <InfoRow
                    label="Guardian"
                    value={profile.student.guardianName || '—'}
                  />
                  <InfoRow
                    label="Guardian phone"
                    value={profile.student.guardianPhone || '—'}
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Present address"
                    value={profile.student.presentAddress || '—'}
                    full
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Permanent address"
                    value={profile.student.permanentAddress || '—'}
                    full
                  />
                  <InfoRow
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Security deposit"
                    value={formatBDT(profile.student.securityDeposit)}
                  />
                  {profile.student.notes && (
                    <InfoRow
                      label="Notes"
                      value={profile.student.notes}
                      full
                    />
                  )}
                </div>
              </SectionCard>

              {/* Current seat */}
              <SectionCard
                title="Current seat"
                className="mb-4"
                actions={
                  profile.currentSeat ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openChangeSeat}
                    >
                      <Armchair className="h-4 w-4" />
                      Change
                    </Button>
                  ) : undefined
                }
              >
                {profile.currentSeat ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoRow
                      label="Room"
                      value={`${profile.currentSeat.roomName} · ${profile.currentSeat.seatLabel}`}
                    />
                    <InfoRow
                      label="Monthly rent"
                      value={formatBDT(profile.currentSeat.monthlyRent)}
                    />
                    <InfoRow
                      label="Move-in date"
                      value={formatDate(profile.currentSeat.moveInDate)}
                    />
                    <InfoRow
                      label="Move-out date"
                      value={
                        profile.currentSeat.moveOutDate
                          ? formatDate(profile.currentSeat.moveOutDate)
                          : 'Present'
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active seat assignment.
                  </p>
                )}
              </SectionCard>

              {/* This-month balance */}
              <SectionCard title="This month" className="mb-4">
                {profile.balance ? (
                  <>
                    <div className="mb-3">
                      <BalanceBadge balance={profile.balance} />
                      <span className="text-muted-foreground ml-2 text-xs">
                        {formatMonth(profile.balance.month)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat
                        label="Billed"
                        value={formatBDT(profile.balance.billed)}
                        tone="info"
                      />
                      <MiniStat
                        label="Paid"
                        value={formatBDT(profile.balance.paid)}
                        tone="positive"
                      />
                      <MiniStat
                        label="Due"
                        value={formatBDT(profile.balance.due)}
                        tone="danger"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bill generated for this month yet.
                  </p>
                )}
              </SectionCard>

              {/* All-time ledger summary */}
              <SectionCard title="All-time summary" className="mb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat
                    label="Total billed"
                    value={formatBDT(profile.ledgerSummary.totalBilled)}
                    tone="info"
                  />
                  <MiniStat
                    label="Total paid"
                    value={formatBDT(profile.ledgerSummary.totalPaid)}
                    tone="positive"
                  />
                  <MiniStat
                    label="Total due"
                    value={formatBDT(profile.ledgerSummary.totalDue)}
                    tone="danger"
                  />
                </div>
              </SectionCard>

              {/* Ledger history */}
              <SectionCard
                title="Ledger history"
                description="Bills and payments, newest first"
                className="mb-4"
                contentClassName="p-0"
              >
                <div className="max-h-72 overflow-y-auto scroll-slim">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            <Loader2 className="text-muted-foreground mx-auto h-4 w-4 animate-spin" />
                          </TableCell>
                        </TableRow>
                      ) : ledger.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-muted-foreground py-6 text-center text-sm"
                          >
                            <Inbox className="mx-auto mb-1 h-5 w-5" />
                            No ledger entries yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ledger.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(e.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  e.type === 'bill'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                                )}
                              >
                                {e.type === 'bill' ? 'Bill' : 'Payment'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <div className="flex flex-col">
                                <span>
                                  {e.type === 'bill' && e.month
                                    ? `Bill · ${formatMonth(e.month)}`
                                    : e.method
                                      ? `Payment · ${
                                          paymentMethodLabel[
                                            e.method as keyof typeof paymentMethodLabel
                                          ] ?? e.method
                                        }`
                                      : 'Payment'}
                                </span>
                                {(e.txnRef || e.note) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {e.txnRef ? `Ref: ${e.txnRef}` : ''}
                                    {e.txnRef && e.note ? ' · ' : ''}
                                    {e.note ?? ''}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className={cn(
                                'whitespace-nowrap text-right text-xs font-medium',
                                e.type === 'bill'
                                  ? 'text-blue-600 dark:text-blue-300'
                                  : 'text-emerald-600 dark:text-emerald-300'
                              )}
                            >
                              {e.type === 'bill' ? '+' : '−'}
                              {formatBDT(e.amount)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-xs font-semibold">
                              {formatBDT(e.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>

              {/* Seat history */}
              <SectionCard
                title="Seat history"
                description="Past and current assignments"
                className="mb-4"
              >
                {profile.seatHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No seat assignments on record.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {profile.seatHistory.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {h.roomName} · Seat {h.seatLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(h.moveInDate)} →{' '}
                            {h.moveOutDate
                              ? formatDate(h.moveOutDate)
                              : 'Present'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">
                            {formatBDT(h.monthlyRent)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            /month
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openChangeSeat}
                >
                  <Armchair className="h-4 w-4" />
                  Change seat
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <LogOut className="h-4 w-4" />
                      Check out
                    </Button>
                  }
                  title="Check out this student?"
                  description="The student will be marked as Former and their current seat assignment will be closed. This action cannot be undone."
                  confirmLabel="Check out"
                  onConfirm={async () => {
                    await checkoutMutation.mutateAsync()
                  }}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ---------------- Add Student Dialog ---------------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>
              Create a new resident profile. You can assign a seat afterwards.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit((v) => createMutation.mutate(v))}
            className="max-h-[70vh] overflow-y-auto px-1 py-1 scroll-slim"
          >
            <StudentFormFields form={addForm} />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Add student'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Edit Profile Dialog ---------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update student details. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
            className="max-h-[70vh] overflow-y-auto px-1 py-1 scroll-slim"
          >
            <StudentFormFields form={editForm} />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Change Seat Dialog ---------------- */}
      <Dialog open={changeSeatOpen} onOpenChange={setChangeSeatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change seat</DialogTitle>
            <DialogDescription>
              Assign {profile?.student.fullName ?? 'this student'} to a new
              available seat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {roomsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : roomsQuery.isError ? (
              <p className="text-sm text-rose-600">
                Could not load rooms. Please try again.
              </p>
            ) : availableSeats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available seats right now. Free up a seat first or ask an
                administrator to add more capacity.
              </p>
            ) : (
              <>
                <Field label="Available seat">
                  <Select value={seatPick} onValueChange={handleSeatPick}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a seat…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSeats.map((s) => (
                        <SelectItem key={s.seatId} value={s.seatId}>
                          {s.roomName} · {s.label}
                          {s.defaultRent ? ` · ৳${s.defaultRent}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Move-in date">
                  <Input
                    type="date"
                    value={seatMoveIn}
                    onChange={(e) => setSeatMoveIn(e.target.value)}
                  />
                </Field>
                <Field label="Monthly rent (৳)">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={seatRent}
                    onChange={(e) => setSeatRent(e.target.value)}
                    placeholder="e.g. 6500"
                  />
                </Field>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangeSeatOpen(false)}
              disabled={assignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => assignMutation.mutate()}
              disabled={
                assignMutation.isPending ||
                !seatPick ||
                availableSeats.length === 0
              }
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                'Assign seat'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Small subcomponents                                                         */
/* -------------------------------------------------------------------------- */

function InfoRow({
  label,
  value,
  icon,
  full,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-muted-foreground mb-0.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
        {icon}
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'default' | 'positive' | 'danger' | 'info'
}) {
  const toneClass: Record<typeof tone, string> = {
    default: 'text-slate-700 dark:text-slate-200',
    positive: 'text-emerald-700 dark:text-emerald-300',
    danger: 'text-rose-700 dark:text-rose-300',
    info: 'text-blue-700 dark:text-blue-300',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={cn('mt-0.5 text-sm font-semibold', toneClass[tone])}>
        {value}
      </p>
    </div>
  )
}
