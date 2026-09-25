// Student — full profile (with current seat, current-month balance, ledger summary) & update.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { monthKey } from '@/lib/format'
import { STUDENT_STATUS, type StudentStatus } from '@/lib/types'

const PatchBody = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(40).optional().nullable(),
  studentIdRef: z.string().max(60).optional().nullable(),
  email: z.string().email().max(180).optional().nullable(),
  guardianName: z.string().max(120).optional().nullable(),
  guardianPhone: z.string().max(40).optional().nullable(),
  presentAddress: z.string().max(400).optional().nullable(),
  permanentAddress: z.string().max(400).optional().nullable(),
  institution: z.string().max(200).optional().nullable(),
  securityDeposit: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum([STUDENT_STATUS.ACTIVE, STUDENT_STATUS.FORMER]).optional(),
})

// GET /api/students/[id] — full profile.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const student = await db.student.findUnique({ where: { id } })
    if (!student) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const currentSeat = await db.seatAssignment.findFirst({
      where: { studentId: id, active: true },
      include: { seat: { include: { room: true } } },
      orderBy: { moveInDate: 'desc' },
    })

    const seatHistory = await db.seatAssignment.findMany({
      where: { studentId: id },
      include: { seat: { include: { room: true } } },
      orderBy: { moveInDate: 'desc' },
    })

    // Current-month balance
    const month = monthKey()
    const bill = await db.bill.findUnique({
      where: { studentId_month: { studentId: id, month } },
      include: { payments: { select: { amount: true } } },
    })
    const balance = bill
      ? {
          month,
          billed: bill.amount,
          paid: bill.payments.reduce((sum, p) => sum + p.amount, 0),
          due: bill.amount - bill.payments.reduce((sum, p) => sum + p.amount, 0),
        }
      : null

    // All-time ledger summary (aggregate)
    const bills = await db.bill.findMany({
      where: { studentId: id },
      select: { amount: true },
    })
    const payments = await db.payment.findMany({
      where: { studentId: id },
      select: { amount: true },
    })
    const totalBilled = bills.reduce((s, b) => s + b.amount, 0)
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    const ledgerSummary = {
      totalBilled,
      totalPaid,
      totalDue: totalBilled - totalPaid,
    }

    return Response.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        phone: student.phone,
        studentIdRef: student.studentIdRef,
        email: student.email,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        presentAddress: student.presentAddress,
        permanentAddress: student.permanentAddress,
        institution: student.institution,
        status: student.status,
        securityDeposit: student.securityDeposit,
        notes: student.notes,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      currentSeat: currentSeat
        ? {
            id: currentSeat.id,
            seatId: currentSeat.seatId,
            roomId: currentSeat.seat.roomId,
            roomName: currentSeat.seat.room.name,
            seatLabel: currentSeat.seat.label,
            monthlyRent: currentSeat.monthlyRent,
            moveInDate: currentSeat.moveInDate,
            moveOutDate: currentSeat.moveOutDate,
          }
        : null,
      seatHistory: seatHistory.map((a) => ({
        id: a.id,
        roomId: a.seat.roomId,
        roomName: a.seat.room.name,
        seatLabel: a.seat.label,
        monthlyRent: a.monthlyRent,
        moveInDate: a.moveInDate,
        moveOutDate: a.moveOutDate,
        active: a.active,
      })),
      balance,
      ledgerSummary,
    })
  } catch (err) {
    return handleError(err)
  }
}

// PATCH /api/students/[id] — update profile fields.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const json = await req.json()
    const parsed = PatchBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const existing = await db.student.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    const d = parsed.data
    const data: Record<string, unknown> = {}
    if (d.fullName !== undefined) data.fullName = d.fullName
    if (d.phone !== undefined) data.phone = d.phone
    if (d.studentIdRef !== undefined) data.studentIdRef = d.studentIdRef
    if (d.email !== undefined) data.email = d.email
    if (d.guardianName !== undefined) data.guardianName = d.guardianName
    if (d.guardianPhone !== undefined) data.guardianPhone = d.guardianPhone
    if (d.presentAddress !== undefined) data.presentAddress = d.presentAddress
    if (d.permanentAddress !== undefined)
      data.permanentAddress = d.permanentAddress
    if (d.institution !== undefined) data.institution = d.institution
    if (d.securityDeposit !== undefined) data.securityDeposit = d.securityDeposit
    if (d.notes !== undefined) data.notes = d.notes
    if (d.status !== undefined)
      data.status = d.status as StudentStatus

    const updated = await db.student.update({ where: { id }, data })
    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}
