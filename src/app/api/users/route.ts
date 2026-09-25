// Admin-only: list all users (without password hashes).
import { db } from '@/lib/db'
import { requireAdmin, handleError } from '@/lib/auth'

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
