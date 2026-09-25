// Module navigation definitions for the app shell.
import {
  LayoutDashboard,
  Users,
  DoorClosed,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { type Role } from '@/lib/types'

export type ModuleId =
  | 'dashboard'
  | 'students'
  | 'rooms'
  | 'billing'
  | 'expenses'
  | 'reports'
  | 'settings'

export interface NavItem {
  id: ModuleId
  label: string
  description: string
  icon: LucideIcon
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview & quick actions',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'students',
    label: 'Students',
    description: 'Active & former residents',
    icon: Users,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'rooms',
    label: 'Rooms & Seats',
    description: 'Floor-wise seat map',
    icon: DoorClosed,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'billing',
    label: 'Billing & Payments',
    description: 'Record payments & receipts',
    icon: Receipt,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Utilities & operating costs',
    icon: Wallet,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Monthly & yearly financials',
    icon: BarChart3,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    id: 'settings',
    label: 'Users & Settings',
    description: 'Managers, permissions, system',
    icon: Settings,
    roles: ['ADMIN'],
  },
]

export const ROLE_ICONS: Record<Role, LucideIcon> = {
  ADMIN: ShieldCheck,
  MANAGER: Users,
}
