// GET /api/dashboard/outstanding
// Top outstanding dues for the current month (sorted by due desc, limit 10).

import { db } from '@/lib/db'
import { handleError, requireUser } from '@/lib/auth'
import { monthKey } from '@/lib/format'

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

export async function GET() {
  try {
    await requireUser()

    const month = monthKey(new Date())

    const bills = await db.bill.findMany({
      where: { month },
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        payments: { select: { amount: true } },
      },
    })

    const rows: OutstandingRow[] = bills
      .map((b) => {
        const paid = b.payments.reduce((s, p) => s + p.amount, 0)
        return {
          billId: b.id,
          studentId: b.studentId,
          studentName: b.student.fullName,
          phone: b.student.phone,
          month: b.month,
          billed: b.amount,
          paid,
          due: Math.max(0, b.amount - paid),
        }
      })
      .filter((r) => r.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 10)

    // Total outstanding across ALL current-month bills (not just the top 10).
    const totalDue = bills
      .map((b) =>
        Math.max(0, b.amount - b.payments.reduce((s, p) => s + p.amount, 0))
      )
      .reduce((s, d) => s + d, 0)

    return Response.json({ rows, totalDue })
  } catch (err) {
    return handleError(err)
  }
}
