// Expenses — list (recent 100) and create.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { EXPENSE_CATEGORY } from '@/lib/types'

const CreateBody = z.object({
  category: z.enum([
    EXPENSE_CATEGORY.ELECTRICITY,
    EXPENSE_CATEGORY.GAS,
    EXPENSE_CATEGORY.WATER,
    EXPENSE_CATEGORY.INTERNET,
    EXPENSE_CATEGORY.SALARY,
    EXPENSE_CATEGORY.OTHERS,
  ]),
  amount: z.number().positive(),
  incurredOn: z.string().min(1), // "YYYY-MM-DD" or ISO
  note: z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const fromRaw = url.searchParams.get('from')
    const toRaw = url.searchParams.get('to')
    const category = url.searchParams.get('category')

    const where: {
      incurredOn?: { gte?: Date; lte?: Date }
      category?: string
    } = {}
    if (fromRaw || toRaw) {
      where.incurredOn = {}
      if (fromRaw) where.incurredOn.gte = new Date(fromRaw)
      if (toRaw) where.incurredOn.lte = new Date(toRaw)
    }
    if (category && category !== 'ALL') {
      where.category = category
    }

    const rows = await db.expense.findMany({
      where,
      orderBy: { incurredOn: 'desc' },
      take: 100,
      include: { createdBy: { select: { name: true } } },
    })

    const expenses = rows.map((r) => ({
      id: r.id,
      category: r.category,
      amount: r.amount,
      incurredOn: r.incurredOn,
      note: r.note ?? '',
      createdByName: r.createdBy?.name ?? 'System',
      createdAt: r.createdAt,
    }))

    return Response.json({ expenses })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser()
    const json = await req.json()
    const parsed = CreateBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { category, amount, incurredOn, note } = parsed.data
    const expense = await db.expense.create({
      data: {
        category,
        amount,
        incurredOn: new Date(incurredOn),
        note: note ?? null,
        createdById: me.id,
      },
      include: { createdBy: { select: { name: true } } },
    })
    console.log(`[expenses] ${me.email} created ${category} ${amount}`)
    return Response.json(
      {
        id: expense.id,
        category: expense.category,
        amount: expense.amount,
        incurredOn: expense.incurredOn,
        note: expense.note ?? '',
        createdByName: expense.createdBy?.name ?? 'System',
        createdAt: expense.createdAt,
      },
      { status: 201 }
    )
  } catch (err) {
    return handleError(err)
  }
}
