// GET /api/dashboard/summary
// Overview metrics for the current month — seats, rent billed/collected/outstanding, students.

import { db } from '@/lib/db'
import { handleError, requireUser } from '@/lib/auth'
import { monthKey } from '@/lib/format'
import { STUDENT_STATUS } from '@/lib/types'

export async function GET() {
  try {
    await requireUser()

    const now = new Date()
    const month = monthKey(now)

    // Month bounds for "paidAt in current month" filter.
    const [y, m] = month.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 1)

    const [
      totalSeats,
      occupiedSeats,
      rentBilledAgg,
      rentCollectedAgg,
      outstandingPaidAgg,
      activeStudents,
      formerStudents,
      outstandingBills,
    ] = await Promise.all([
      db.seat.count(),
      db.seatAssignment.count({ where: { active: true } }),
      db.bill.aggregate({ where: { month }, _sum: { amount: true } }),
      db.payment.aggregate({
        where: { paidAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // Payments linked to any bill whose month is the current month
      // (relation filter — what's been collected against this month's bills).
      db.payment.aggregate({
        where: { bill: { month } },
        _sum: { amount: true },
      }),
      db.student.count({ where: { status: STUDENT_STATUS.ACTIVE } }),
      db.student.count({ where: { status: STUDENT_STATUS.FORMER } }),
      // Distinct students with due > 0 for the current month.
      db.bill.findMany({
        where: { month },
        select: {
          studentId: true,
          amount: true,
          payments: { select: { amount: true } },
        },
      }),
    ])

    const rentBilledThisMonth = rentBilledAgg._sum.amount ?? 0
    const rentCollectedThisMonth = rentCollectedAgg._sum.amount ?? 0
    const outstandingPaid = outstandingPaidAgg._sum.amount ?? 0
    const outstandingRent = Math.max(0, rentBilledThisMonth - outstandingPaid)
    const availableSeats = Math.max(0, totalSeats - occupiedSeats)

    // Count distinct students who still owe money this month.
    const dueByStudent = new Map<string, number>()
    for (const b of outstandingBills) {
      const paid = b.payments.reduce((s, p) => s + p.amount, 0)
      const due = b.amount - paid
      if (due > 0) {
        dueByStudent.set(b.studentId, (dueByStudent.get(b.studentId) ?? 0) + due)
      }
    }
    const outstandingCount = dueByStudent.size

    return Response.json({
      occupiedSeats,
      availableSeats,
      totalSeats,
      rentBilledThisMonth,
      rentCollectedThisMonth,
      outstandingRent,
      outstandingCount,
      activeStudents,
      formerStudents,
      month,
    })
  } catch (err) {
    return handleError(err)
  }
}
