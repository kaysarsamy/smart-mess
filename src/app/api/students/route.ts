// Students — list (with current seat + current-month balance) & create.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { monthKey } from '@/lib/format'
import { STUDENT_STATUS } from '@/lib/types'

const CreateBody = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(40).optional().nullable(),
  studentIdRef: z.string().max(60).optional().nullable(),
  email: z.string().email().max(180).optional().nullable(),
  guardianName: z.string().max(120).optional().nullable(),
  guardianPhone: z.string().max(40).optional().nullable(),
  presentAddress: z.string().max(400).optional().nullable(),
  permanentAddress: z.string().max(400).optional().nullable(),
  institution: z.string().max(200).optional().nullable(),
  securityDeposit: z.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
})

// GET /api/students?q=&status=ACTIVE|FORMER
export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim() ?? ''
    const statusParam = url.searchParams.get('status')?.toUpperCase()

    const where: {
      status?: string
      OR?: Array<Record<string, { contains: string }>>
    } = {}
    if (statusParam === STUDENT_STATUS.ACTIVE || statusParam === STUDENT_STATUS.FORMER) {
      where.status = statusParam
    }
    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { studentIdRef: { contains: q } },
      ]
    }

    const students = await db.student.findMany({
      where,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
    })

    const month = monthKey()
    const enriched = await Promise.all(
      students.map(async (s) => {
        const currentSeat = await db.seatAssignment.findFirst({
          where: { studentId: s.id, active: true },
          include: { seat: { include: { room: true } } },
        })
        const bill = await db.bill.findUnique({
          where: { studentId_month: { studentId: s.id, month } },
          include: { payments: { select: { amount: true } } },
        })
        let balance: { billed: number; paid: number; due: number } | null = null
        if (bill) {
          const paid = bill.payments.reduce((sum, p) => sum + p.amount, 0)
          balance = { billed: bill.amount, paid, due: bill.amount - paid }
        }
        return {
          id: s.id,
          fullName: s.fullName,
          phone: s.phone,
          studentIdRef: s.studentIdRef,
          institution: s.institution,
          status: s.status,
          currentSeat: currentSeat
            ? {
                id: currentSeat.id,
                roomId: currentSeat.seat.roomId,
                roomName: currentSeat.seat.room.name,
                seatLabel: currentSeat.seat.label,
                monthlyRent: currentSeat.monthlyRent,
                moveInDate: currentSeat.moveInDate,
              }
            : null,
          balance,
        }
      })
    )

    return Response.json({ students: enriched })
  } catch (err) {
    return handleError(err)
  }
}

// POST /api/students — create a new (ACTIVE) student.
export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const json = await req.json()
    const parsed = CreateBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const d = parsed.data
    const student = await db.student.create({
      data: {
        fullName: d.fullName,
        phone: d.phone ?? null,
        studentIdRef: d.studentIdRef ?? null,
        email: d.email ?? null,
        guardianName: d.guardianName ?? null,
        guardianPhone: d.guardianPhone ?? null,
        presentAddress: d.presentAddress ?? null,
        permanentAddress: d.permanentAddress ?? null,
        institution: d.institution ?? null,
        securityDeposit: d.securityDeposit,
        notes: d.notes ?? null,
        status: STUDENT_STATUS.ACTIVE,
      },
    })
    return Response.json(student, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
