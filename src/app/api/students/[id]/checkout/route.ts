// Student checkout — set FORMER, close active SeatAssignment (transactional).
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { STUDENT_STATUS } from '@/lib/types'

// POST /api/students/[id]/checkout
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const existing = await db.student.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const now = new Date()
    const updated = await db.$transaction(async (tx) => {
      // Close any active seat assignments for this student.
      await tx.seatAssignment.updateMany({
        where: { studentId: id, active: true },
        data: { active: false, moveOutDate: now },
      })
      // Mark student as FORMER.
      return tx.student.update({
        where: { id },
        data: { status: STUDENT_STATUS.FORMER },
      })
    })

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}
