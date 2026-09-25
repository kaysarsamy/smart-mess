// Admin-only: key-value system settings (mess name, currency, etc.).
// GET returns a flat key→value map. PATCH accepts either
//   { updates: { key: value, ... } } (bulk) or { key, value } (single)
// and returns the full updated map.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin, handleError } from '@/lib/auth'

async function readSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany()
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

export async function GET() {
  try {
    await requireAdmin()
    const settings = await readSettingsMap()
    return Response.json({ settings })
  } catch (err) {
    return handleError(err)
  }
}

const PatchBody = z
  .object({
    updates: z.record(z.string(), z.string()).optional(),
    key: z.string().min(1).max(120).optional(),
    value: z.string().max(2000).optional(),
  })
  .refine(
    (v) => v.updates !== undefined || (v.key !== undefined && v.value !== undefined),
    { message: 'Provide either `updates` map or `key`+`value`' }
  )

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
    const json = await req.json().catch(() => ({}))
    const parsed = PatchBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const entries: { key: string; value: string }[] = []
    if (parsed.data.updates) {
      for (const [k, v] of Object.entries(parsed.data.updates)) {
        entries.push({ key: k, value: v })
      }
    } else if (parsed.data.key !== undefined && parsed.data.value !== undefined) {
      entries.push({ key: parsed.data.key, value: parsed.data.value })
    }

    // Upsert each entry (SQLite-friendly sequential writes).
    for (const { key, value } of entries) {
      await db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    }

    const settings = await readSettingsMap()
    return Response.json({ settings })
  } catch (err) {
    return handleError(err)
  }
}
