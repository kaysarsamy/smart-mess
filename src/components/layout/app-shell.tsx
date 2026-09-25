'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { type AppUser } from '@/lib/types'
import { useUIStore } from '@/lib/ui-store'

interface AppShellProps {
  initialUser: AppUser | null
  modules: Record<string, React.ComponentType>
}

export function AppShell({ initialUser, modules }: AppShellProps) {
  const { data: session, status } = useSession()
  const active = useUIStore((s) => s.activeModule)
  const setModule = useUIStore((s) => s.setModule)
  const [mobileOpen, setMobileOpen] = useState(false)

  const user =
    (session?.user as AppUser | undefined) ?? (status === 'loading' ? initialUser : null)

  // Role fallback: non-admin can't see settings.
  const effectiveActive =
    active === 'settings' && user && user.role !== 'ADMIN' ? 'dashboard' : active

  if (status === 'loading' && !initialUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const ActiveView = (modules[effectiveActive] ?? modules.dashboard) as React.ComponentType

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar
          active={effectiveActive}
          onChange={setModule}
          user={user}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar active={effectiveActive} onOpenMobile={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <ActiveView />
            </div>
          </main>
          <footer className="mt-auto border-t border-slate-200 bg-background/80 px-4 py-3 backdrop-blur dark:border-slate-800 sm:px-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-1 text-xs text-muted-foreground sm:flex-row">
              <p>
                <span className="font-medium text-foreground">Smart Mess</span> · Hostel &amp; Mess Management
              </p>
              <p>
                Signed in as <span className="font-medium text-foreground">{user.email}</span> ({user.role})
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
