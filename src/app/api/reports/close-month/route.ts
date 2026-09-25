// POST /api/reports/close-month?month=YYYY-MM  (admin only)
// Upserts a MonthlyClose record, marking the month as reviewed & locked.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, handleError } from '@/lib/auth'
import { monthKey } from '@/lib/format'

function parseMonth(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw
  return monthKey()
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireAdmin()
    const month = parseMonth(req.nextUrl.searchParams.get('month'))

    const record = await db.monthlyClose.upsert({
      where: { month },
      update: {
        closedAt: new Date(),
        closedById: me.id,
      },
      create: {
        month,
        closedAt: new Date(),
        closedById: me.id,
      },
      select: {
        month: true,
        closedAt: true,
        closedById: true,
      },
    })

    console.log(`[reports] ${me.email} closed month ${month}`)
    return Response.json({
      month: record.month,
      closed: true,
      closedAt: record.closedAt,
    })
  } catch (err) {
    return handleError(err)
  }
}
