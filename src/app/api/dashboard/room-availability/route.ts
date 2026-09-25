// GET /api/dashboard/room-availability
// Floor-wise seat map preview — every floor, every room, every seat with active assignment.

import { db } from '@/lib/db'
import { handleError, requireUser } from '@/lib/auth'

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

export async function GET() {
  try {
    await requireUser()

    const floors = await db.floor.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            seats: {
              orderBy: { label: 'asc' },
              include: {
                assignments: {
                  where: { active: true },
                  include: { student: { select: { id: true, fullName: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    const result: FloorPreview[] = floors.map((f) => ({
      id: f.id,
      name: f.name,
      level: f.level,
      rooms: f.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        monthlyRent: r.monthlyRent,
        seats: r.seats.map<SeatPreview>((s) => {
          const a = s.assignments[0]
          return {
            id: s.id,
            label: s.label,
            occupied: !!a,
            studentName: a?.student.fullName ?? null,
            studentId: a?.student.id ?? null,
          }
        }),
      })),
    }))

    return Response.json({ floors: result })
  } catch (err) {
    return handleError(err)
  }
}
