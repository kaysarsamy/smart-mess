// Seed Smart Mess database with demo data (CLI entry point).
// Run with: bun run db:seed
// The actual logic lives in src/lib/seed.ts so it can be reused by the
// /api/setup/seed route for production post-deploy seeding.
import { PrismaClient } from '@prisma/client'
import { runSeed } from '../src/lib/seed'

const db = new PrismaClient()

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

async function main() {
  console.log('→ seeding Smart Mess…')
  const summary = await runSeed(db)
  console.log('✓ seed complete')
  console.table(summary)
  console.log('  login → admin@smartmess.app / admin123')
  console.log('  login → manager@smartmess.app / manager123')
}
