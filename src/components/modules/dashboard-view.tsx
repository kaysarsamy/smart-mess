'use client'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRight,
  BedDouble,
  CreditCard,
  AlertCircle,
  ReceiptText,
  UserPlus,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { StatCard } from '@/components/shared/stat-card'
import { formatBDT, formatMonth } from '@/lib/format'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'

// ---------- API response types ----------
interface Summary {
  occupiedSeats: number
  availableSeats: number
  totalSeats: number
  rentBilledThisMonth: number
  rentCollectedThisMonth: number
  outstandingRent: number
  outstandingCount: number
  activeStudents: number
  formerStudents: number
  month: string
}

interface OutstandingRow {
  billId: string
  studentId: string
  studentName: string
  phone: string | null
  month: string
  billed: number
  paid: number
  due: number
}

interface OutstandingResp {
  rows: OutstandingRow[]
  totalDue: number
}

interface SeatPreview {
  id: string
  label: string
  occupied: boolean
  studentName: string | null
  studentId: string | null
}

interface RoomPreview {
  id: string
  name: string
  type: string
  monthlyRent: number
  seats: SeatPreview[]
}

interface FloorPreview {
  id: string
  name: string
  level: number
  rooms: RoomPreview[]
}

interface RoomsResp {
  floors: FloorPreview[]
}

// ---------- View ----------
export default function DashboardView() {
  const setModule = useUIStore((s) => s.setModule)
  const startPayment = useUIStore((s) => s.startPayment)
  const requestAddStudent = useUIStore((s) => s.requestAddStudent)

  const summaryQ = useQuery<Summary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/summary')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to load summary')
      }
      return res.json() as Promise<Summary>
    },
    refetchInterval: 30_000,
  })

  const outstandingQ = useQuery<OutstandingResp>({
    queryKey: ['dashboard', 'outstanding'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/outstanding')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to load outstanding dues')
      }
      return res.json() as Promise<OutstandingResp>
    },
    refetchInterval: 30_000,
  })

  const roomsQ = useQuery<RoomsResp>({
    queryKey: ['dashboard', 'rooms'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/room-availability')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to load room availability')
      }
      return res.json() as Promise<RoomsResp>
    },
    refetchInterval: 30_000,
  })

  const isLoading =
    summaryQ.isLoading || outstandingQ.isLoading || roomsQ.isLoading

  if (summaryQ.isError) {
    toast.error(
      summaryQ.error instanceof Error
        ? summaryQ.error.message
        : 'Failed to load dashboard summary'
    )
  }
  if (outstandingQ.isError) {
    toast.error(
      outstandingQ.error instanceof Error
        ? outstandingQ.error.message
        : 'Failed to load outstanding dues'
    )
  }
  if (roomsQ.isError) {
    toast.error(
      roomsQ.error instanceof Error
        ? roomsQ.error.message
        : 'Failed to load room availability'
    )
  }

  const summary = summaryQ.data
  const outstanding = outstandingQ.data
  const rooms = roomsQ.data

  const occupiedSeatCount =
    rooms?.floors.reduce(
      (sum, f) => sum + f.rooms.reduce((s, r) => s + r.seats.filter((x) => x.occupied).length, 0),
      0
    ) ?? 0
  const totalSeatCount =
    rooms?.floors.reduce(
      (sum, f) => sum + f.rooms.reduce((s, r) => s + r.seats.length, 0),
      0
    ) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of seats, rent and outstanding dues."
        actions={
          <>
            <Button onClick={() => setModule('billing')}>
              <CreditCard className="h-4 w-4" />
              Record payment
            </Button>
            <Button variant="outline" onClick={() => requestAddStudent()}>
              <UserPlus className="h-4 w-4" />
              Add student
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Seats Occupied"
          value={
            summary
              ? `${summary.occupiedSeats}/${summary.totalSeats}`
              : '—/—'
          }
          hint={summary ? `${summary.availableSeats} available` : undefined}
          icon={<BedDouble className="h-5 w-5" />}
          tone="info"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Rent Billed"
          value={summary ? formatBDT(summary.rentBilledThisMonth) : '৳ 0'}
          hint={summary ? formatMonth(summary.month) : undefined}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="info"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Rent Collected"
          value={summary ? formatBDT(summary.rentCollectedThisMonth) : '৳ 0'}
          hint="This month"
          icon={<Wallet className="h-5 w-5" />}
          tone="positive"
          loading={summaryQ.isLoading}
        />
        <StatCard
          label="Outstanding Rent"
          value={summary ? formatBDT(summary.outstandingRent) : '৳ 0'}
          hint={
            summary
              ? `${summary.outstandingCount} student${
                  summary.outstandingCount === 1 ? '' : 's'
                } with due`
              : undefined
          }
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
          loading={summaryQ.isLoading}
        />
      </div>

      {/* Main two-column area */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Outstanding Payments */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Outstanding Payments"
            description={
              outstanding
                ? `${outstanding.rows.length} of total ${formatBDT(
                    outstanding.totalDue
                  )} outstanding this month`
                : 'Current month dues'
            }
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModule('billing')}
              >
                Open billing
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          >
            {outstandingQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : outstanding && outstanding.rows.length > 0 ? (
              <div className="max-h-96 overflow-y-auto scroll-slim pr-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        Paid
                      </TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstanding.rows.map((r) => (
                      <TableRow key={r.billId}>
                        <TableCell className="font-medium text-foreground">
                          {r.studentName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {r.phone ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatMonth(r.month)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBDT(r.billed)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
                          {formatBDT(r.paid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                            {formatBDT(r.due)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              startPayment({
                                studentId: r.studentId,
                                billId: r.billId,
                                month: r.month,
                              })
                            }
                          >
                            <CreditCard className="h-4 w-4" />
                            Collect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No outstanding dues"
                description="Every student has settled this month's rent in full."
                icon={<Wallet className="h-6 w-6" />}
              />
            )}
          </SectionCard>
        </div>

        {/* Room Availability */}
        <SectionCard
          title="Room Availability"
          description={
            rooms
              ? `${occupiedSeatCount}/${totalSeatCount} occupied`
              : 'Live seat map'
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModule('rooms')}
            >
              View map
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          {roomsQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : rooms && rooms.floors.length > 0 ? (
            <div
              className="max-h-96 overflow-y-auto scroll-slim cursor-pointer pr-1"
              onClick={() => setModule('rooms')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setModule('rooms')
              }}
            >
              {/* Legend */}
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                  Occupied
                </span>
              </div>

              <div className="space-y-4">
                {rooms.floors.map((floor) => (
                  <div key={floor.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {floor.name}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {
                          floor.rooms.reduce(
                            (s, r) =>
                              s + r.seats.filter((x) => x.occupied).length,
                            0
                          )
                        }
                        /
                        {floor.rooms.reduce((s, r) => s + r.seats.length, 0)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {floor.rooms.map((room) => {
                        const occ = room.seats.filter((s) => s.occupied).length
                        return (
                          <div
                            key={room.id}
                            className="rounded-lg border border-slate-200/70 p-2 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between px-1 pb-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {room.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {occ}/{room.seats.length} · {room.type}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {room.seats.map((seat) => (
                                <span
                                  key={seat.id}
                                  title={
                                    seat.occupied
                                      ? `${seat.label} · ${
                                          seat.studentName ?? 'Occupied'
                                        }`
                                      : `${seat.label} · Available`
                                  }
                                  className={cn(
                                    'flex h-6 min-w-6 items-center justify-center rounded px-1 text-[10px] font-semibold text-white',
                                    seat.occupied
                                      ? 'bg-rose-500 hover:bg-rose-600'
                                      : 'bg-emerald-500 hover:bg-emerald-600'
                                  )}
                                >
                                  {seat.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No rooms configured"
              description="Add floors and rooms in the Rooms module to see availability here."
              icon={<BedDouble className="h-6 w-6" />}
            />
          )}
        </SectionCard>
      </div>

      {/* Tiny hint when something is loading but the rest already rendered */}
      {isLoading && (
        <p className="sr-only" aria-live="polite">
          Refreshing dashboard data…
        </p>
      )}
    </div>
  )
}
