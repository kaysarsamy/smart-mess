'use client'

import { Building2, LogOut, X } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { NAV_ITEMS, type ModuleId, ROLE_ICONS } from '@/lib/nav'
import { type AppUser } from '@/lib/types'
import { initials } from '@/lib/format'

interface SidebarProps {
  active: ModuleId
  onChange: (id: ModuleId) => void
  user: AppUser
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ active, onChange, user, mobileOpen, onCloseMobile }: SidebarProps) {
  const items = NAV_ITEMS.filter((it) => it.roles.includes(user.role))

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Smart Mess</p>
              <p className="text-[11px] text-sidebar-foreground/60">Management Suite</p>
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChange(item.id)
                    onCloseMobile()
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4.5 w-4.5 shrink-0',
                      isActive
                        ? 'text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-sidebar-border" />

        {/* User card */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {user.name}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60">
                {(() => {
                  const RIcon = ROLE_ICONS[user.role]
                  return <RIcon className="h-3 w-3" />
                })()}
                <span className="uppercase">{user.role}</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
