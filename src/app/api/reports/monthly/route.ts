// GET /api/reports/monthly?month=YYYY-MM
// Aggregates rent billed/collected/due, expenses, payment-method & expense-category
// breakdowns, plus occupancy/security-deposit context for the given month.
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { monthKey } from '@/lib/format'
import { PAYMENT_METHOD, EXPENSE_CATEGORY } from '@/lib/types'

function parseMonth(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
  return monthKey()
}

export async function GET(req: Request) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const month = parseMonth(url.searchParams.get('month'))

    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1) // exclusive upper bound

    // --- Rent billed (all bills of this month) ---
    const billAgg = await db.bill.aggregate({
      where: { month },
      _sum: { amount: true },
    })
    const rentBilled = billAgg._sum.amount ?? 0

    // --- Rent collected: sum of all payments whose paidAt falls in this month ---
    const collectedAgg = await db.payment.aggregate({
      where: { paidAt: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const rentCollected = collectedAgg._sum.amount ?? 0

    // --- Rent due: billed - payments linked to bills of this month ---
    const linkedPaymentsAgg = await db.payment.aggregate({
      where: { bill: { month } },
      _sum: { amount: true },
    })
    const rentDue = Math.max(0, rentBilled - (linkedPaymentsAgg._sum.amount ?? 0))

    // --- Expenses total this month ---
    const expenseAgg = await db.expense.aggregate({
      where: { incurredOn: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const expenseTotal = expenseAgg._sum.amount ?? 0

    // --- Net ---
    const net = rentCollected - expenseTotal

    // --- Payment methods breakdown (by paidAt) ---
    const methodGroups = await db.payment.groupBy({
      by: ['method'],
      where: { paidAt: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const paymentMethods: Record<string, number> = {}
    for (const k of Object.values(PAYMENT_METHOD)) {
      paymentMethods[k] = 0
    }
    for (const g of methodGroups) {
      if (g.method) paymentMethods[g.method] = g._sum.amount ?? 0
    }

    // --- Expenses by category ---
    const catGroups = await db.expense.groupBy({
      by: ['category'],
      where: { incurredOn: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    const expensesByCategory: Record<string, number> = {}
    for (const k of Object.values(EXPENSE_CATEGORY)) {
      expensesByCategory[k] = 0
    }
    for (const g of catGroups) {
      if (g.category) expensesByCategory[g.category] = g._sum.amount ?? 0
    }

    // --- Other info ---
    const depositAgg = await db.student.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { securityDeposit: true },
    })
    const activeStudents = await db.student.count({
      where: { status: 'ACTIVE' },
    })
    const formerStudents = await db.student.count({
      where: { status: 'FORMER' },
    })
    const occupiedSeats = await db.seatAssignment.count({
      where: { active: true },
    })

    // --- Closed status ---
    const close = await db.monthlyClose.findUnique({
      where: { month },
      select: { closedAt: true },
    })

    return Response.json({
      month,
      rentBilled,
      rentCollected,
      rentDue,
      expenseTotal,
      net,
      paymentMethods,
      expensesByCategory,
      otherInfo: {
        securityDepositTotal: depositAgg._sum.securityDeposit ?? 0,
        activeStudents,
        occupiedSeats,
        formerStudents,
      },
      closed: !!close,
      closedAt: close?.closedAt ?? null,
    })
  } catch (err) {
    return handleError(err)
  }
}
