// POST /api/setup/seed?token=<SETUP_SECRET>
// Seeds the production database with demo data + admin/manager accounts.
// Protected by SETUP_SECRET env var so only the deployer can trigger it.
// Idempotent — safe to call multiple times.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { runSeed } from '@/lib/seed'
import { handleError } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get('token')
    const expected = process.env.SETUP_SECRET
    if (!expected) {
      return Response.json({ error: 'SETUP_SECRET_NOT_CONFIGURED' }, { status: 503 })
    }
    if (!token || token !== expected) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const summary = await runSeed(db)
    return Response.json({ ok: true, summary })
  } catch (err) {
    return handleError(err)
  }
}

// GET alias for easy curl/browser triggering (same token check).
export async function GET(req: NextRequest) {
  return POST(req)
}
