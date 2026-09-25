// Single room seats + assignable students (ACTIVE students without an active seat).
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { STUDENT_STATUS } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const room = await db.room.findUnique({
      where: { id },
      include: {
        floor: { select: { id: true, name: true, level: true } },
        seats: {
          orderBy: { label: 'asc' },
          include: {
            assignments: {
              where: { active: true },
              include: {
                student: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    })
    if (!room) {
      return Response.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    }

    // Students who are ACTIVE and have no current active seat assignment.
    const assignable = await db.student.findMany({
      where: {
        status: STUDENT_STATUS.ACTIVE,
        assignments: { none: { active: true } },
      },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, phone: true },
    })

    const seats = room.seats.map((s) => {
      const current = s.assignments[0]
      return {
        id: s.id,
        label: s.label,
        occupied: s.assignments.length > 0,
        student: current?.student ?? null,
      }
    })

    return Response.json({
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        monthlyRent: room.monthlyRent,
        floor: room.floor,
      },
      seats,
      assignableStudents: assignable,
    })
  } catch (err) {
    return handleError(err)
  }
}
