// Admin-only: update or soft-delete a user.
// Soft delete = set active=false (preserves Payment/Expense FK integrity).
// LAST_ADMIN safeguard: cannot demote/deactivate the only remaining active ADMIN.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin, handleError } from '@/lib/auth'
import { ROLE, type Role } from '@/lib/types'

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum([ROLE.ADMIN, ROLE.MANAGER]).optional(),
  phone: z.string().max(40).nullable().optional(),
  active: z.boolean().optional(),
})

type GuardOk = { ok: true }
type GuardFail = { ok: false; status: 400 | 404; error: 'LAST_ADMIN' | 'NOT_FOUND' }

/// Reject mutations that would leave zero active admins.
async function lastAdminGuard(
  userId: string,
  changes: { role?: string; active?: boolean }
): Promise<GuardOk | GuardFail> {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true },
  })
  if (!target) return { ok: false, status: 404, error: 'NOT_FOUND' }

  const removingAdmin =
    target.role === ROLE.ADMIN &&
    target.active === true &&
    ((changes.role !== undefined && changes.role !== ROLE.ADMIN) ||
      changes.active === false)

  if (!removingAdmin) return { ok: true }

  const adminCount = await db.user.count({
    where: { role: ROLE.ADMIN, active: true },
  })
  if (adminCount <= 1) {
    return { ok: false, status: 400, error: 'LAST_ADMIN' }
  }
  return { ok: true }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdmin()
    const { id } = await params
    const json = await req.json().catch(() => ({}))
    const parsed = PatchBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { name, role, phone, active } = parsed.data

    const guard = await lastAdminGuard(id, { role, active })
    if (!guard.ok) {
      return Response.json({ error: guard.error }, { status: guard.status })
    }

    const data: {
      name?: string
      role?: Role
      phone?: string | null
      active?: boolean
    } = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role as Role
    if (phone !== undefined) data.phone = phone ?? null
    if (active !== undefined) data.active = active

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    })
    console.log(`[users] ${me.email} updated ${updated.email} (${updated.role})`)
    return Response.json({ user: updated })
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdmin()
    const { id } = await params
    // Soft delete only — preserve Payment/Expense FK integrity.
    const guard = await lastAdminGuard(id, { active: false })
    if (!guard.ok) {
      return Response.json({ error: guard.error }, { status: guard.status })
    }
    await db.user.update({
      where: { id },
      data: { active: false },
    })
    console.log(`[users] ${me.email} soft-deleted user ${id}`)
    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
