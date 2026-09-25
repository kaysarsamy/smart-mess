'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Armchair,
  BedDouble,
  Building2,
  Check,
  ChevronsUpDown,
  DoorClosed,
  Loader2,
  LogOut,
  Plus,
  UserCheck,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import { ROOM_TYPE, type RoomType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatBDT, initials, toDateInputValue } from '@/lib/format'

// ---------------- API types ----------------
interface ApiSeat {
  id: string
  label: string
  occupied: boolean
  student: { id: string; fullName: string } | null
}
interface ApiRoom {
  id: string
  name: string
  type: string
  monthlyRent: number
  seats: ApiSeat[]
}
interface ApiFloor {
  id: string
  name: string
  level: number
  rooms: ApiRoom[]
}
interface FloorsResponse {
  floors: ApiFloor[]
}

interface AssignableStudent {
  id: string
  fullName: string
  phone?: string | null
}
interface SeatsResponse {
  room: {
    id: string
    name: string
    type: string
    monthlyRent: number
    floor: { id: string; name: string; level: number }
  }
  seats: ApiSeat[]
  assignableStudents: AssignableStudent[]
}

const ROOM_TYPES: RoomType[] = [
  ROOM_TYPE.SINGLE,
  ROOM_TYPE.DOUBLE,
  ROOM_TYPE.TRIPLE,
  ROOM_TYPE.SHARED,
]

// ---------------- Main view ----------------
export default function RoomsView() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<FloorsResponse>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const r = await fetch('/api/rooms')
      if (!r.ok) throw new Error('Failed to load rooms')
      return (await r.json()) as FloorsResponse
    },
  })
  const floors = data?.floors ?? []

  const stats = useMemo(() => {
    let total = 0
    let occupied = 0
    for (const f of floors) {
      for (const r of f.rooms) {
        total += r.seats.length
        occupied += r.seats.filter((s) => s.occupied).length
      }
    }
    return {
      total,
      occupied,
      available: total - occupied,
      rate: total === 0 ? 0 : Math.round((occupied / total) * 100),
    }
  }, [floors])

  // ---- Dialog state ----
  const [assignTarget, setAssignTarget] = useState<{
    roomId: string
    seatId: string
    label: string
    roomName: string
    monthlyRent: number
  } | null>(null)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [popoverSeatId, setPopoverSeatId] = useState<string | null>(null)

  // ---- Vacate mutation ----
  const vacateMutation = useMutation({
    mutationFn: async (seatId: string) => {
      const r = await fetch(`/api/seats/${seatId}/vacate`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'VACATE_FAILED')
      return j
    },
    onSuccess: () => {
      toast.success('Seat vacated')
      qc.invalidateQueries({ queryKey: ['rooms'] })
      setPopoverSeatId(null)
    },
    onError: (e: Error) => {
      toast.error(`Could not vacate: ${e.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & Seats"
        description="Floor-wise seat map."
        actions={
          <Button onClick={() => setAddRoomOpen(true)}>
            <Plus /> Add Room
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Seats"
          value={stats.total.toLocaleString('en-BD')}
          loading={isLoading}
          icon={<Armchair className="size-5" />}
          tone="info"
        />
        <StatCard
          label="Occupied"
          value={stats.occupied.toLocaleString('en-BD')}
          hint={stats.total ? `${stats.rate}% occupancy` : undefined}
          loading={isLoading}
          icon={<UserCheck className="size-5" />}
          tone="danger"
        />
        <StatCard
          label="Available"
          value={stats.available.toLocaleString('en-BD')}
          loading={isLoading}
          icon={<DoorClosed className="size-5" />}
          tone="positive"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-rose-200 dark:bg-rose-800" />
          Occupied
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <FloorsSkeleton />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors yet"
          description="Create a room to get started. Floors come from your existing data."
          icon={<Building2 className="size-6" />}
          action={
            <Button onClick={() => setAddRoomOpen(true)}>
              <Plus /> Add Room
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {floors.map((floor) => (
            <SectionCard
              key={floor.id}
              title={
                <span className="flex items-center gap-2">
                  <Building2 className="size-4 text-slate-500" />
                  {floor.name}
                </span>
              }
              description={`${floor.rooms.length} room${
                floor.rooms.length === 1 ? '' : 's'
              }`}
            >
              {floor.rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rooms on this floor.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {floor.rooms.map((room) => (
                    <Card
                      key={room.id}
                      className="border-slate-200/70 dark:border-slate-800"
                    >
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <BedDouble className="size-4 shrink-0 text-slate-500" />
                            <span className="truncate font-semibold text-foreground">
                              {room.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            {room.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatBDT(room.monthlyRent)} / seat
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {room.seats.length === 0 ? (
                            <p className="col-span-full text-xs text-muted-foreground">
                              No seats configured.
                            </p>
                          ) : (
                            room.seats.map((seat) => (
                              <SeatTile
                                key={seat.id}
                                seat={seat}
                                popoverOpen={popoverSeatId === seat.id}
                                onPopoverChange={(o) =>
                                  setPopoverSeatId(o ? seat.id : null)
                                }
                                onAssign={() =>
                                  setAssignTarget({
                                    roomId: room.id,
                                    seatId: seat.id,
                                    label: seat.label,
                                    roomName: room.name,
                                    monthlyRent: room.monthlyRent,
                                  })
                                }
                                onVacate={(id) => vacateMutation.mutate(id)}
                                vacating={
                                  vacateMutation.isPending &&
                                  vacateMutation.variables === seat.id
                                }
                              />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}

      {/* Assign dialog */}
      {assignTarget && (
        <AssignSeatDialog
          target={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* Add room dialog */}
      <AddRoomDialog
        open={addRoomOpen}
        onOpenChange={setAddRoomOpen}
        floors={floors.map((f) => ({
          id: f.id,
          name: f.name,
          level: f.level,
        }))}
      />
    </div>
  )
}

// ---------------- Seat tile ----------------
interface SeatTileProps {
  seat: ApiSeat
  popoverOpen: boolean
  onPopoverChange: (open: boolean) => void
  onAssign: () => void
  onVacate: (seatId: string) => void
  vacating: boolean
}

function SeatTile({
  seat,
  popoverOpen,
  onPopoverChange,
  onAssign,
  onVacate,
  vacating,
}: SeatTileProps) {
  if (seat.occupied) {
    return (
      <Popover open={popoverOpen} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-auto flex-col items-center justify-center gap-0.5 py-2',
              'border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800',
              'dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950'
            )}
          >
            <span className="text-xs font-semibold">{seat.label}</span>
            <span className="text-[10px] uppercase tracking-wide">
              {seat.student ? initials(seat.student.fullName) : '—'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {seat.student ? initials(seat.student.fullName) : '?'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {seat.student?.fullName ?? 'Occupied'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Seat {seat.label}
                </p>
              </div>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={vacating}
                >
                  {vacating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  Vacate Seat
                </Button>
              }
              title="Vacate this seat?"
              description={
                <>
                  This will mark{' '}
                  <strong>{seat.student?.fullName ?? 'the occupant'}</strong> as
                  moved out of seat <strong>{seat.label}</strong>. The student
                  remains Active — they simply have no seat assigned.
                </>
              }
              confirmLabel="Confirm Vacate"
              onConfirm={() => onVacate(seat.id)}
            />
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={onAssign}
      className={cn(
        'h-auto flex-col items-center justify-center gap-0.5 py-2',
        'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800',
        'dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950'
      )}
    >
      <span className="text-xs font-semibold">{seat.label}</span>
      <span className="text-[10px] uppercase tracking-wide">Free</span>
    </Button>
  )
}

// ---------------- Assign seat dialog ----------------
interface AssignTarget {
  roomId: string
  seatId: string
  label: string
  roomName: string
  monthlyRent: number
}

function AssignSeatDialog({
  target,
  onClose,
}: {
  target: AssignTarget
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState<string>('')
  const [studentOpen, setStudentOpen] = useState(false)
  const [moveInDate, setMoveInDate] = useState(toDateInputValue())
  const [monthlyRent, setMonthlyRent] = useState<string>(
    String(target.monthlyRent)
  )
  const [studentQuery, setStudentQuery] = useState('')

  const { data, isLoading: loadingSeats } = useQuery<SeatsResponse>({
    queryKey: ['room-seats', target.roomId],
    queryFn: async () => {
      const r = await fetch(`/api/rooms/${target.roomId}/seats`)
      if (!r.ok) throw new Error('Failed to load seat data')
      return (await r.json()) as SeatsResponse
    },
    enabled: !!target.roomId,
  })

  const assignable = data?.assignableStudents ?? []
  const filtered = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return assignable
    return assignable.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) || (s.phone ?? '').includes(q)
    )
  }, [assignable, studentQuery])

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/seats/${target.seatId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          moveInDate: new Date(moveInDate).toISOString(),
          monthlyRent: Number(monthlyRent) || 0,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'ASSIGN_FAILED')
      return j
    },
    onSuccess: () => {
      toast.success('Seat assigned')
      qc.invalidateQueries({ queryKey: ['rooms'] })
      onClose()
    },
    onError: (e: Error) => {
      const msg =
        e.message === 'SEAT_OCCUPIED'
          ? 'This seat was just assigned to someone else.'
          : e.message === 'STUDENT_NOT_FOUND'
            ? 'Selected student no longer exists.'
            : `Could not assign: ${e.message}`
      toast.error(msg)
    },
  })

  const submit = () => {
    if (!studentId) {
      toast.error('Select a student first.')
      return
    }
    if (!moveInDate) {
      toast.error('Pick a move-in date.')
      return
    }
    mutation.mutate()
  }

  const selectedStudent = assignable.find((s) => s.id === studentId)

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="size-4 text-slate-500" />
            Assign Seat {target.label}
          </DialogTitle>
          <DialogDescription>
            Room <strong>{target.roomName}</strong> — choose an active student
            without a current seat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student combobox */}
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Popover open={studentOpen} onOpenChange={setStudentOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  disabled={loadingSeats}
                >
                  <span className="truncate">
                    {selectedStudent
                      ? selectedStudent.fullName
                      : loadingSeats
                        ? 'Loading…'
                        : 'Select student…'}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name or phone…"
                    value={studentQuery}
                    onValueChange={setStudentQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingSeats
                        ? 'Loading…'
                        : assignable.length === 0
                          ? 'No assignable students (all active students have seats).'
                          : 'No match.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {filtered.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id}
                          onSelect={() => {
                            setStudentId(s.id)
                            setStudentOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'size-4',
                              studentId === s.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="truncate">{s.fullName}</span>
                          {s.phone && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {s.phone}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {assignable.length === 0 && !loadingSeats && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                All active students currently have seats. Vacate a seat first or
                add a new student.
              </p>
            )}
          </div>

          {/* Move-in date */}
          <div className="space-y-1.5">
            <Label htmlFor="move-in">Move-in date</Label>
            <Input
              id="move-in"
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
            />
          </div>

          {/* Monthly rent */}
          <div className="space-y-1.5">
            <Label htmlFor="rent">Monthly rent (BDT)</Label>
            <Input
              id="rent"
              type="number"
              min={0}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Default rent for this room is {formatBDT(target.monthlyRent)}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={mutation.isPending || assignable.length === 0}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Assigning…
              </>
            ) : (
              <>
                <UserCheck className="size-4" /> Assign Seat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Add room dialog ----------------
interface AddRoomDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  floors: { id: string; name: string; level: number }[]
}

function AddRoomDialog({ open, onOpenChange, floors }: AddRoomDialogProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [floorId, setFloorId] = useState('')
  const [type, setType] = useState<RoomType>(ROOM_TYPE.SHARED)
  const [monthlyRent, setMonthlyRent] = useState('5500')

  // Derived effective floorId — falls back to first floor until user picks.
  const effectiveFloorId = floorId || floors[0]?.id || ''

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          floorId: effectiveFloorId,
          type,
          monthlyRent: Number(monthlyRent) || 0,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'CREATE_FAILED')
      return j
    },
    onSuccess: () => {
      toast.success('Room created')
      qc.invalidateQueries({ queryKey: ['rooms'] })
      setName('')
      setMonthlyRent('5500')
      setType(ROOM_TYPE.SHARED)
      onOpenChange(false)
    },
    onError: (e: Error) => {
      const msg =
        e.message === 'ROOM_NAME_TAKEN'
          ? 'A room with this name already exists.'
          : e.message === 'FLOOR_NOT_FOUND'
            ? 'Selected floor does not exist.'
            : `Could not create: ${e.message}`
      toast.error(msg)
    },
  })

  const submit = () => {
    if (!name.trim()) {
      toast.error('Enter a room name.')
      return
    }
    if (!effectiveFloorId) {
      toast.error('Pick a floor.')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="size-4 text-slate-500" /> Add Room
          </DialogTitle>
          <DialogDescription>
            Create a new room. Seats can be configured later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              placeholder="e.g. Room 201"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Floor</Label>
            <Select value={effectiveFloorId} onValueChange={setFloorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {floors.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No floors exist yet — create floors in the database first.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as RoomType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rent-room">Monthly rent (BDT)</Label>
              <Input
                id="rent-room"
                type="number"
                min={0}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={mutation.isPending || floors.length === 0}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus className="size-4" /> Create Room
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Skeleton ----------------
function FloorsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <SectionCard key={i} title={<Skeleton className="h-4 w-32" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <Card key={j} className="border-slate-200/70 dark:border-slate-800">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <Skeleton key={k} className="h-14" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  )
}
