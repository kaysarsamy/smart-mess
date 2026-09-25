// Single bill API — GET bill with student + payments.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

function paidSum(payments: { amount: number }[]): number {
  return payments.reduce((acc, p) => acc + (p.amount || 0), 0)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const bill = await db.bill.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true } },
        payments: {
          orderBy: { paidAt: 'desc' },
          include: {
            receivedBy: { select: { name: true } },
          },
        },
      },
    })
    if (!bill) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    const paid = paidSum(bill.payments)
    return Response.json({
      bill: {
        id: bill.id,
        studentId: bill.studentId,
        studentName: bill.student.fullName,
        month: bill.month,
        amount: bill.amount,
        paid,
        due: Math.max(0, bill.amount - paid),
        dueDate: bill.dueDate.toISOString(),
        createdAt: bill.createdAt.toISOString(),
        payments: bill.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          txnRef: p.txnRef,
          payerName: p.payerName,
          note: p.note,
          receivedByName: p.receivedBy?.name ?? null,
          paidAt: p.paidAt.toISOString(),
        })),
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
