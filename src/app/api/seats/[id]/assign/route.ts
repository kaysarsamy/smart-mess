// Assign a student to a seat (move-in). Transaction-safe: closes any
// previous active assignment for the student, refuses if seat is occupied.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

const AssignBody = z.object({
  studentId: z.string().min(1),
  moveInDate: z.string().min(1), // ISO date string
  monthlyRent: z.number().nonnegative(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const json = await req.json().catch(() => ({}))
    const parsed = AssignBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { studentId, moveInDate, monthlyRent } = parsed.data

    const moveIn = new Date(moveInDate)
    if (Number.isNaN(moveIn.getTime())) {
      return Response.json({ error: 'BAD_DATE' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const seat = await tx.seat.findUnique({
        where: { id },
        include: {
          room: { select: { id: true, name: true } },
          assignments: {
            where: { active: true },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      })
      if (!seat) {
        throw new Error('SEAT_NOT_FOUND')
      }
      // Seat occupied?
      if (seat.assignments.length > 0) {
        const occ = seat.assignments[0]
        const err = new Error('SEAT_OCCUPIED') as Error & {
          status?: number
          occupant?: string
        }
        err.status = 409
        err.occupant = occ.student?.fullName ?? ''
        throw err
      }

      // Student exists?
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: { assignments: { where: { active: true } } },
      })
      if (!student) {
        throw new Error('STUDENT_NOT_FOUND')
      }

      // Close any active assignment for the student.
      if (student.assignments.length > 0) {
        await tx.seatAssignment.updateMany({
          where: { studentId, active: true },
          data: { active: false, moveOutDate: new Date() },
        })
      }

      const assignment = await tx.seatAssignment.create({
        data: {
          seatId: id,
          studentId,
          moveInDate: moveIn,
          monthlyRent,
          active: true,
        },
        include: {
          student: { select: { id: true, fullName: true } },
        },
      })

      return {
        seat: {
          id: seat.id,
          label: seat.label,
          roomId: seat.roomId,
          room: seat.room,
          occupied: true,
          student: assignment.student,
        },
        assignment: {
          id: assignment.id,
          studentId: assignment.studentId,
          seatId: assignment.seatId,
          moveInDate: assignment.moveInDate,
          monthlyRent: assignment.monthlyRent,
          active: assignment.active,
        },
      }
    })
    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'SEAT_NOT_FOUND') {
        return Response.json({ error: 'SEAT_NOT_FOUND' }, { status: 404 })
      }
      if (err.message === 'STUDENT_NOT_FOUND') {
        return Response.json({ error: 'STUDENT_NOT_FOUND' }, { status: 404 })
      }
      if (err.message === 'SEAT_OCCUPIED') {
        return Response.json({ error: 'SEAT_OCCUPIED' }, { status: 409 })
      }
    }
    return handleError(err)
  }
}
