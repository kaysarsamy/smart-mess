// Receipt API — printable receipt data for a single payment.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

const DEFAULT_MESS_NAME = 'Smart Mess — Mirpur 10'

async function getMessName(): Promise<string> {
  const setting = await db.setting.findUnique({
    where: { key: 'messName' },
    select: { value: true },
  })
  return setting?.value || DEFAULT_MESS_NAME
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, fullName: true, phone: true, studentIdRef: true },
        },
        bill: { select: { id: true, month: true, amount: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    if (!payment) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const messName = await getMessName()

    return Response.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        txnRef: payment.txnRef,
        payerName: payment.payerName,
        note: payment.note,
        paidAt: payment.paidAt.toISOString(),
      },
      student: {
        id: payment.student.id,
        fullName: payment.student.fullName,
        phone: payment.student.phone,
        studentIdRef: payment.student.studentIdRef,
      },
      bill: payment.bill
        ? {
            id: payment.bill.id,
            month: payment.bill.month,
            amount: payment.bill.amount,
          }
        : null,
      messName,
      receivedByName: payment.receivedBy?.name ?? null,
      receiptNo: `SM-${payment.id.slice(-6).toUpperCase()}`,
    })
  } catch (err) {
    return handleError(err)
  }
}
