// Prisma client. Uses a plain SQLite connection for local dev, and the
// libSQL driver adapter for remote Turso (serverless / Vercel).
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logOptions =
  process.env.NODE_ENV !== 'production'
    ? (['query', 'error', 'warn'] as const)
    : (['error', 'warn'] as const)

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./db/custom.db'
  // Remote libSQL (Turso) — used in production / Vercel
  if (
    url.startsWith('libsql:') ||
    url.startsWith('http:') ||
    url.startsWith('https:') ||
    url.startsWith('wss:')
  ) {
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN ?? undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({
      adapter,
      log: logOptions,
    } as ConstructorParameters<typeof PrismaClient>[0])
  }
  // Local dev: plain SQLite file
  return new PrismaClient({ log: logOptions })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
