// Student ledger — merged bills + payments with running balance.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

interface RawEntry {
  id: string
  type: 'bill' | 'payment'
  date: Date
  month?: string | null
  amount: number
  method?: string | null
  txnRef?: string | null
  note?: string | null
}

// GET /api/students/[id]/ledger
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!student) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const [bills, payments] = await Promise.all([
      db.bill.findMany({
        where: { studentId: id },
        select: {
          id: true,
          month: true,
          amount: true,
          createdAt: true,
          dueDate: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.payment.findMany({
        where: { studentId: id },
        select: {
          id: true,
          amount: true,
          method: true,
          txnRef: true,
          note: true,
          paidAt: true,
        },
        orderBy: { paidAt: 'asc' },
      }),
    ])

    // Build raw entries (bill amount adds, payment subtracts in running balance).
    const raw: RawEntry[] = [
      ...bills.map((b) => ({
        id: b.id,
        type: 'bill' as const,
        date: b.createdAt,
        month: b.month,
        amount: b.amount,
        method: null,
        txnRef: null,
        note: null,
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: 'payment' as const,
        date: p.paidAt,
        month: null,
        amount: p.amount,
        method: p.method,
        txnRef: p.txnRef,
        note: p.note,
      })),
    ]

    // Sort ascending by date to compute the running balance.
    raw.sort((a, b) => a.date.getTime() - b.date.getTime())

    let running = 0
    const withBalance = raw.map((e) => {
      if (e.type === 'bill') {
        running += e.amount
      } else {
        running -= e.amount
      }
      return {
        id: e.id,
        type: e.type,
        date: e.date,
        month: e.month ?? undefined,
        amount: e.amount,
        method: e.method ?? undefined,
        txnRef: e.txnRef ?? undefined,
        note: e.note ?? undefined,
        balanceAfter: running,
      }
    })

    // Newest first for display.
    withBalance.reverse()

    return Response.json({ entries: withBalance })
  } catch (err) {
    return handleError(err)
  }
}
