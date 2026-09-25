// Bills API — list (optionally filtered by studentId+month) & generate monthly bill.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

function defaultDueDate(month: string): string {
  // Default: 10th of the bill's month at 23:59 local.
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return new Date().toISOString()
  return new Date(y, m - 1, 10, 23, 59, 0, 0).toISOString()
}

function paidSum(payments: { amount: number }[]): number {
  return payments.reduce((acc, p) => acc + (p.amount || 0), 0)
}

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId') || undefined
    const month = url.searchParams.get('month') || undefined

    // If both provided, return matching bills (0 or 1 by unique constraint).
    if (studentId && month) {
      const bills = await db.bill.findMany({
        where: { studentId, month },
        include: {
          student: { select: { fullName: true } },
          payments: { select: { amount: true } },
        },
        take: 5,
      })
      return Response.json({
        bills: bills.map((b) => {
          const paid = paidSum(b.payments)
          return {
            id: b.id,
            studentId: b.studentId,
            studentName: b.student.fullName,
            month: b.month,
            amount: b.amount,
            paid,
            due: Math.max(0, b.amount - paid),
            dueDate: b.dueDate.toISOString(),
            createdAt: b.createdAt.toISOString(),
          }
        }),
      })
    }

    // Otherwise return recent 50 with student + sum of payments.
    const bills = await db.bill.findMany({
      include: {
        student: { select: { fullName: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({
      bills: bills.map((b) => {
        const paid = paidSum(b.payments)
        return {
          id: b.id,
          studentId: b.studentId,
          studentName: b.student.fullName,
          month: b.month,
          amount: b.amount,
          paid,
          due: Math.max(0, b.amount - paid),
          dueDate: b.dueDate.toISOString(),
          createdAt: b.createdAt.toISOString(),
        }
      }),
    })
  } catch (err) {
    return handleError(err)
  }
}

const CreateBill = z.object({
  studentId: z.string().min(1),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'INVALID_MONTH'),
  amount: z.number().positive(),
  dueDate: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const json = await req.json()
    const parsed = CreateBill.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { studentId, month, amount, dueDate } = parsed.data

    const exists = await db.bill.findUnique({
      where: { studentId_month: { studentId, month } },
      select: { id: true },
    })
    if (exists) {
      return Response.json({ error: 'BILL_EXISTS' }, { status: 409 })
    }

    // Ensure student exists (ForeignKey safety).
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true },
    })
    if (!student) {
      return Response.json({ error: 'STUDENT_NOT_FOUND' }, { status: 404 })
    }

    const bill = await db.bill.create({
      data: {
        studentId,
        month,
        amount,
        dueDate: new Date(dueDate ?? defaultDueDate(month)),
      },
      include: {
        student: { select: { fullName: true } },
        payments: { select: { amount: true } },
      },
    })
    const paid = paidSum(bill.payments)
    return Response.json(
      {
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
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return handleError(err)
  }
}
