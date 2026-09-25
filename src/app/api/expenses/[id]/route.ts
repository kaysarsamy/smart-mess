// Expenses — delete by id.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser()
    const { id } = await params
    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    await db.expense.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
