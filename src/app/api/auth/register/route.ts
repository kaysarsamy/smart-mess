// Admin-only: create a new manager (or admin) account.
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin, handleError } from '@/lib/auth'
import { ROLE, type Role } from '@/lib/types'

const Body = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(180),
  password: z.string().min(6).max(120),
  role: z.enum([ROLE.ADMIN, ROLE.MANAGER]).default(ROLE.MANAGER),
  phone: z.string().max(40).optional().nullable(),
  active: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const me = await requireAdmin()
    const json = await req.json()
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { name, email, password, role, phone, active } = parsed.data
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return Response.json({ error: 'EMAIL_TAKEN' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role as Role,
        phone: phone ?? null,
        active,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true },
    })
    console.log(`[users] ${me.email} created ${user.email} (${user.role})`)
    return Response.json(user, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}

// GET /api/auth/register — list all users (admin only)
export async function GET() {
  try {
    await requireAdmin()
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
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
    return Response.json({ users })
  } catch (err) {
    return handleError(err)
  }
}
