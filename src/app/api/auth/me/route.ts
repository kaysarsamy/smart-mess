// Returns the currently authenticated user (or 401).
import { getSession } from '@/lib/auth'
import { ROLE } from '@/lib/types'

export async function GET() {
  const user = await getSession()
  if (!user) return Response.json({ user: null, roles: Object.values(ROLE) }, { status: 401 })
  return Response.json({ user, roles: Object.values(ROLE) })
}
