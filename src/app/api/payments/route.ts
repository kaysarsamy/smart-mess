// Payments API — list recent (optionally filtered) & record a payment.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { PAYMENT_METHOD } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId') || undefined
    const month = url.searchParams.get('month') || undefined
    const method = url.searchParams.get('method') || undefined

    const where: {
      studentId?: string
      method?: string
      bill?: { month?: string }
    } = {}
    if (studentId) where.studentId = studentId
    if (method) where.method = method
    if (month) where.bill = { month }

    const payments = await db.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: 50,
      include: {
        student: { select: { id: true, fullName: true } },
        bill: { select: { id: true, month: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    return Response.json({
      payments: payments.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student.fullName,
        billId: p.billId,
        billMonth: p.bill?.month ?? null,
        amount: p.amount,
        method: p.method,
        txnRef: p.txnRef,
        payerName: p.payerName,
        note: p.note,
        receivedByName: p.receivedBy?.name ?? null,
        paidAt: p.paidAt.toISOString(),
      })),
    })
  } catch (err) {
    return handleError(err)
  }
}

const RecordPayment = z.object({
  studentId: z.string().min(1),
  billId: z.string().nullable().optional(),
  amount: z.number().positive(),
  method: z.enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.BKASH, PAYMENT_METHOD.NAGAD, PAYMENT_METHOD.BANK]),
  txnRef: z.string().max(120).optional().nullable(),
  payerName: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser()
    const json = await req.json()
    const parsed = RecordPayment.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { studentId, billId, amount, method, txnRef, payerName, note } = parsed.data

    // FK safety: student must exist.
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true },
    })
    if (!student) {
      return Response.json({ error: 'STUDENT_NOT_FOUND' }, { status: 404 })
    }

    // If billId provided, it must exist (and belong to that student).
    if (billId) {
      const bill = await db.bill.findUnique({
        where: { id: billId },
        select: { id: true, studentId: true, month: true, amount: true },
      })
      if (!bill) {
        return Response.json({ error: 'BILL_NOT_FOUND' }, { status: 404 })
      }
      if (bill.studentId !== studentId) {
        return Response.json({ error: 'BILL_STUDENT_MISMATCH' }, { status: 400 })
      }
    }

    const payment = await db.payment.create({
      data: {
        studentId,
        billId: billId ?? null,
        amount,
        method,
        txnRef: txnRef ?? null,
        payerName: payerName ?? null,
        note: note ?? null,
        receivedById: me.id,
      },
      include: {
        student: { select: { id: true, fullName: true } },
        bill: { select: { id: true, month: true, amount: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    console.log(
      `[payments] ${me.email} recorded ৳${payment.amount} (${payment.method}) for ${payment.student.fullName}`
    )

    return Response.json(
      {
        payment: {
          id: payment.id,
          studentId: payment.studentId,
          studentName: payment.student.fullName,
          billId: payment.billId,
          billMonth: payment.bill?.month ?? null,
          amount: payment.amount,
          method: payment.method,
          txnRef: payment.txnRef,
          payerName: payment.payerName,
          note: payment.note,
          receivedById: payment.receivedById,
          receivedByName: payment.receivedBy?.name ?? null,
          paidAt: payment.paidAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return handleError(err)
  }
}
