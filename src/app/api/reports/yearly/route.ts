// GET /api/reports/yearly?year=YYYY
// Returns per-month (Jan-Dec) rentBilled / rentCollected / rentDue / expenseTotal
// and yearly totals. Uses batch queries then reduces in JS to keep query count low.
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { monthKey } from '@/lib/format'

function parseYear(raw: string | null): string {
  const y = Number(raw)
  if (Number.isInteger(y) && y >= 1900 && y <= 2999) return String(y)
  return String(new Date().getFullYear())
}

export async function GET(req: Request) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const year = parseYear(url.searchParams.get('year'))
    const y = Number(year)
    const start = new Date(y, 0, 1)
    const end = new Date(y + 1, 0, 1) // exclusive

    // --- Bills grouped by month (rentBilled) ---
    const billGroups = await db.bill.groupBy({
      by: ['month'],
      where: { month: { startsWith: `${year}-` } },
      _sum: { amount: true },
    })
    const billByMonth: Record<string, number> = {}
    for (const g of billGroups) {
      if (g.month) billByMonth[g.month] = g._sum.amount ?? 0
    }

    // --- Payments in this year (rentCollected by paidAt + rentDue by bill.month) ---
    const paymentsInYear = await db.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      select: {
        amount: true,
        paidAt: true,
        bill: { select: { month: true } },
      },
    })
    const collectedByMonth: Record<string, number> = {}
    const linkedByBillMonth: Record<string, number> = {}
    for (const p of paymentsInYear) {
      const paidMonth = monthKey(p.paidAt)
      collectedByMonth[paidMonth] = (collectedByMonth[paidMonth] ?? 0) + p.amount
      if (p.bill?.month) {
        linkedByBillMonth[p.bill.month] =
          (linkedByBillMonth[p.bill.month] ?? 0) + p.amount
      }
    }

    // --- Expenses grouped by incurredOn month ---
    const expensesInYear = await db.expense.findMany({
      where: { incurredOn: { gte: start, lt: end } },
      select: { amount: true, incurredOn: true },
    })
    const expensesByMonth: Record<string, number> = {}
    for (const e of expensesInYear) {
      const k = monthKey(e.incurredOn)
      expensesByMonth[k] = (expensesByMonth[k] ?? 0) + e.amount
    }

    // --- Assemble 12 months + totals ---
    const months: Array<{
      month: string
      rentBilled: number
      rentCollected: number
      rentDue: number
      expenseTotal: number
    }> = []
    const totals = {
      rentBilled: 0,
      rentCollected: 0,
      rentDue: 0,
      expenseTotal: 0,
    }
    for (let mm = 1; mm <= 12; mm++) {
      const key = `${year}-${String(mm).padStart(2, '0')}`
      const rentBilled = billByMonth[key] ?? 0
      const rentCollected = collectedByMonth[key] ?? 0
      const rentDue = Math.max(0, rentBilled - (linkedByBillMonth[key] ?? 0))
      const expenseTotal = expensesByMonth[key] ?? 0
      months.push({ month: key, rentBilled, rentCollected, rentDue, expenseTotal })
      totals.rentBilled += rentBilled
      totals.rentCollected += rentCollected
      totals.rentDue += rentDue
      totals.expenseTotal += expenseTotal
    }

    return Response.json({ year, months, totals })
  } catch (err) {
    return handleError(err)
  }
}
