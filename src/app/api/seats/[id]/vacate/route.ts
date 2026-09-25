// Vacate a seat: close its active assignment.
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const seat = await db.seat.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { active: true },
          include: { student: { select: { id: true, fullName: true } } },
        },
      },
    })
    if (!seat) {
      return Response.json({ error: 'SEAT_NOT_FOUND' }, { status: 404 })
    }
    if (seat.assignments.length === 0) {
      return Response.json({ error: 'NOT_OCCUPIED' }, { status: 400 })
    }

    await db.seatAssignment.updateMany({
      where: { seatId: id, active: true },
      data: { active: false, moveOutDate: new Date() },
    })

    // Student status remains ACTIVE; they just have no seat now.

    return Response.json({
      seat: {
        id: seat.id,
        occupied: false,
        student: null,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
