'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShieldCheck,
  Users,
  Plus,
  Pencil,
  Power,
  Trash2,
  Save,
  Settings,
  KeyRound,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE, type Role } from '@/lib/types'
import { formatDate, initials } from '@/lib/format'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  active: boolean
  createdAt: string
}

export default function SettingsView() {
  const [tab, setTab] = useState<'users' | 'system'>('users')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Settings"
        description="Managers, permissions, and system."
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'users' | 'system')}
      >
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Settings className="h-4 w-4" /> System Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4 space-y-6">
          <UsersTab
            onAdd={() => setAddOpen(true)}
            onEdit={(u) => setEditTarget(u)}
          />
        </TabsContent>
        <TabsContent value="system" className="mt-4 space-y-6">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditUserDialog
        user={editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Users tab

function UsersTab({
  onAdd,
  onEdit,
}: {
  onAdd: () => void
  onEdit: (u: UserRow) => void
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      return json.users as UserRow[]
    },
  })

  if (isError) {
    return (
      <SectionCard title="Managers & Admins">
        <EmptyState
          title="Couldn't load users"
          description="Reload the page to try again."
        />
      </SectionCard>
    )
  }
  if (isLoading) return <UsersSkeleton />

  const users = data ?? []
  if (users.length === 0) {
    return (
      <SectionCard title="Managers & Admins">
        <EmptyState
          title="No users yet"
          description="Add your first manager or admin to get started."
          icon={<Users className="h-6 w-6" />}
          action={
            <Button onClick={onAdd} size="sm">
              <Plus className="h-4 w-4" /> Add user
            </Button>
          }
        />
      </SectionCard>
    )
  }

  const adminCount = users.filter(
    (u) => u.role === ROLE.ADMIN && u.active
  ).length

  return (
    <SectionCard
      title="Managers & Admins"
      description={`${users.length} ${users.length === 1 ? 'user' : 'users'} · ${adminCount} active admin${adminCount === 1 ? '' : 's'}`}
      actions={
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add user
        </Button>
      }
    >
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials(u.name)} active={u.active} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={u.role as Role} />
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                  {u.phone ?? '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge active={u.active} />
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <UserRowMenu user={u} onEdit={onEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-start gap-3">
              <Avatar initials={initials(u.name)} active={u.active} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <UserRowMenu user={u} onEdit={onEdit} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RoleBadge role={u.role as Role} />
                  <StatusBadge active={u.active} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Phone: </span>
                    {u.phone ?? '—'}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Created: </span>
                    {formatDate(u.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function UsersSkeleton() {
  return (
    <SectionCard title="Managers & Admins">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function Avatar({ initials, active }: { initials: string; active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      )}
      aria-hidden
    >
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  if (role === ROLE.ADMIN) {
    return (
      <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
        <ShieldCheck className="h-3 w-3" /> Admin
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      <Users className="h-3 w-3" /> Manager
    </Badge>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
      Active
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
    >
      Inactive
    </Badge>
  )
}

function UserRowMenu({
  user,
  onEdit,
}: {
  user: UserRow
  onEdit: (u: UserRow) => void
}) {
  const qc = useQueryClient()
  const [delOpen, setDelOpen] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.error === 'LAST_ADMIN') throw new Error('LAST_ADMIN')
        throw new Error('FAILED')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(user.active ? 'User deactivated' : 'User reactivated')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => {
      if (err.message === 'LAST_ADMIN') {
        toast.error('Cannot deactivate the last remaining admin.')
      } else {
        toast.error('Could not update user.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.error === 'LAST_ADMIN') throw new Error('LAST_ADMIN')
        if (j.error === 'NOT_FOUND') throw new Error('NOT_FOUND')
        throw new Error('FAILED')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('User removed.')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDelOpen(false)
    },
    onError: (err: Error) => {
      setDelOpen(false)
      if (err.message === 'LAST_ADMIN') {
        toast.error('Cannot remove the last remaining admin.')
      } else {
        toast.error('Could not remove user.')
      }
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open user actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            <Power className="h-4 w-4" />
            {user.active ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => setDelOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.name} ({user.email}) will be marked inactive. Past
              records — payments, expenses — are preserved for accounting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                deleteMutation.mutate()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Removing…' : 'Remove user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ----------------------------------------------------------------------------
// Add user dialog — reuses POST /api/auth/register.
// The form lives in its own component so its state resets on each open
// (Radix Dialog unmounts content when closed).

function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <AddUserForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(ROLE.MANAGER)
  const [phone, setPhone] = useState('')

  const valid =
    name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 6

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      })
      if (res.status === 409) throw new Error('EMAIL_TAKEN')
      if (res.status === 400) throw new Error('INVALID')
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User created.')
      qc.invalidateQueries({ queryKey: ['users'] })
      onDone()
    },
    onError: (err: Error) => {
      if (err.message === 'EMAIL_TAKEN') {
        toast.error('That email is already in use.')
      } else if (err.message === 'INVALID') {
        toast.error('Please check the form fields.')
      } else {
        toast.error('Could not create user.')
      }
    },
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add user</DialogTitle>
        <DialogDescription>
          Create a new manager or admin account.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <Field label="Full name" htmlFor="add-name">
          <Input
            id="add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Karim Ahmed"
            required
            autoFocus
          />
        </Field>
        <Field label="Email" htmlFor="add-email">
          <Input
            id="add-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="karim@smartmess.app"
            required
          />
        </Field>
        <Field label="Password" htmlFor="add-password" hint="Minimum 6 characters.">
          <Input
            id="add-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            minLength={6}
          />
        </Field>
        <Field label="Role" htmlFor="add-role" hint="Admins can manage users & close months.">
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="add-role" className="w-full">
              <SelectValue placeholder="Pick a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLE.MANAGER}>
                <Users className="h-4 w-4" /> Manager
              </SelectItem>
              <SelectItem value={ROLE.ADMIN}>
                <ShieldCheck className="h-4 w-4" /> Admin
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone" htmlFor="add-phone" hint="Optional.">
          <Input
            id="add-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1xxx-xxxxxx"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || !valid}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create user
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

// ----------------------------------------------------------------------------
// Edit user dialog — PATCH /api/users/[id].
// Form lives in its own component keyed by user.id so state re-initializes
// when a different user is selected for editing.

function EditUserDialog({
  user,
  onOpenChange,
}: {
  user: UserRow | null
  onOpenChange: (v: boolean) => void
}) {
  const open = user !== null
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onOpenChange(false)
      }}
    >
      <DialogContent>
        {user && (
          <EditUserForm
            key={user.id}
            user={user}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditUserForm({
  user,
  onDone,
}: {
  user: UserRow
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role as Role)
  const [phone, setPhone] = useState(user.phone ?? '')

  const valid = name.trim().length > 0

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          phone: phone.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.error === 'LAST_ADMIN') throw new Error('LAST_ADMIN')
        if (j.error === 'NOT_FOUND') throw new Error('NOT_FOUND')
        throw new Error('FAILED')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('User updated.')
      qc.invalidateQueries({ queryKey: ['users'] })
      onDone()
    },
    onError: (err: Error) => {
      if (err.message === 'LAST_ADMIN') {
        toast.error('Cannot demote the last remaining admin.')
      } else if (err.message === 'NOT_FOUND') {
        toast.error('User no longer exists.')
      } else {
        toast.error('Could not update user.')
      }
    },
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit user</DialogTitle>
        <DialogDescription>
          Update profile and role for {user.email}.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          mutation.mutate()
        }}
        className="space-y-4"
      >
        <Field label="Full name" htmlFor="edit-name">
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Role" htmlFor="edit-role">
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="edit-role" className="w-full">
              <SelectValue placeholder="Pick a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLE.MANAGER}>
                <Users className="h-4 w-4" /> Manager
              </SelectItem>
              <SelectItem value={ROLE.ADMIN}>
                <ShieldCheck className="h-4 w-4" /> Admin
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone" htmlFor="edit-phone" hint="Optional.">
          <Input
            id="edit-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1xxx-xxxxxx"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || !valid}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

// ----------------------------------------------------------------------------
// System settings tab — GET / PATCH /api/settings.
// Form lives in its own component initialized from fetched data; remounts
// only when the data signature changes (keyed by stringified values).

function SystemSettingsTab() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const json = await res.json()
      return json.settings as Record<string, string>
    },
  })

  if (isError) {
    return (
      <SectionCard title="System Settings">
        <EmptyState
          title="Couldn't load settings"
          description="Reload the page to try again."
        />
      </SectionCard>
    )
  }
  if (isLoading || !data) return <SettingsSkeleton />

  return (
    <SettingsForm
      initial={data}
      onSaved={() => qc.invalidateQueries({ queryKey: ['settings'] })}
    />
  )
}

function SettingsForm({
  initial,
  onSaved,
}: {
  initial: Record<string, string>
  onSaved: () => void
}) {
  const [messName, setMessName] = useState(initial.messName ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? 'BDT')
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? '')
  const [dirty, setDirty] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            messName: messName.trim(),
            currency: currency.trim() || 'BDT',
            contactPhone: contactPhone.trim(),
          },
        }),
      })
      if (!res.ok) throw new Error('FAILED')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Settings saved.')
      setDirty(false)
      onSaved()
    },
    onError: () => {
      toast.error('Could not save settings.')
    },
  })

  return (
    <SectionCard
      title="System Settings"
      description="Mess identity, currency symbol, and contact line."
      actions={
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !dirty}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Mess Name"
          htmlFor="set-messName"
          hint="Shown on bills and reports."
        >
          <Input
            id="set-messName"
            value={messName}
            onChange={(e) => {
              setMessName(e.target.value)
              setDirty(true)
            }}
            placeholder="Smart Mess"
          />
        </Field>
        <Field
          label="Currency"
          htmlFor="set-currency"
          hint="Symbol or ISO code, e.g. BDT."
        >
          <Input
            id="set-currency"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value)
              setDirty(true)
            }}
            placeholder="BDT"
          />
        </Field>
        <Field
          label="Contact Phone"
          htmlFor="set-contactPhone"
          hint="Optional. Shown on receipts."
        >
          <Input
            id="set-contactPhone"
            value={contactPhone}
            onChange={(e) => {
              setContactPhone(e.target.value)
              setDirty(true)
            }}
            placeholder="+880 1xxx-xxxxxx"
          />
        </Field>
      </div>

      <Alert className="mt-5 border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30">
        <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        <AlertTitle>Permissions</AlertTitle>
        <AlertDescription>
          <p>
            <strong>Admin</strong> — full access, including user management and
            month-close.
          </p>
          <p>
            <strong>Manager</strong> — daily operations (students, rooms,
            billing, expenses, report views); no user management and no
            month-close.
          </p>
        </AlertDescription>
      </Alert>
    </SectionCard>
  )
}

function SettingsSkeleton() {
  return (
    <SectionCard
      title="System Settings"
      description="Mess identity, currency symbol, and contact line."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ----------------------------------------------------------------------------
// Field helper

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
