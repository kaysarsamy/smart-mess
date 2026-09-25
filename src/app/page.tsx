import { getSession } from '@/lib/auth'
import { type AppUser } from '@/lib/types'
import { AppShell } from '@/components/layout/app-shell'
import {
  DashboardView,
  StudentsView,
  RoomsView,
  BillingView,
  ExpensesView,
  ReportsView,
  SettingsView,
} from '@/components/modules'
import type { ModuleId } from '@/lib/nav'

// This page reads the NextAuth session from cookies, so it is dynamic.
export const dynamic = 'force-dynamic'

const MODULES: Record<ModuleId, React.ComponentType> = {
  dashboard: DashboardView,
  students: StudentsView,
  rooms: RoomsView,
  billing: BillingView,
  expenses: ExpensesView,
  reports: ReportsView,
  settings: SettingsView,
}

export default async function Home() {
  const user: AppUser | null = await getSession().catch(() => null)
  return <AppShell initialUser={user} modules={MODULES} />
}
