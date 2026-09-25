'use client'

import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS, type ModuleId } from '@/lib/nav'

interface TopbarProps {
  active: ModuleId
  onOpenMobile: () => void
}

export function Topbar({ active, onOpenMobile }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const item = NAV_ITEMS.find((n) => n.id === active)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-background/80 px-4 backdrop-blur-md dark:border-slate-800 sm:px-6">
      <button
        className="rounded-md p-2 text-muted-foreground hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
        onClick={onOpenMobile}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
          {item?.label}
        </h2>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {item?.description}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        className="text-muted-foreground"
      >
        {theme === 'dark' ? (
          <Sun className="h-4.5 w-4.5" />
        ) : (
          <Moon className="h-4.5 w-4.5" />
        )}
      </Button>
    </header>
  )
}
