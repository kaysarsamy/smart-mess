'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Building2, Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      toast({
        title: 'Sign-in failed',
        description: 'Check your email and password, then try again.',
        variant: 'destructive',
      })
      return
    }
    // Force reload to refresh session + user role
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Smart Mess
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hostel &amp; Mess Management System
          </p>
        </div>

        <Card className="border-slate-200/70 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/40">
          <CardHeader>
            <h2 className="text-lg font-semibold">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground">
              Use your admin or manager credentials.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@smartmess.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/50">
              <p className="font-medium text-slate-700 dark:text-slate-200">Demo accounts</p>
              <p className="mt-1">
                Admin → <code className="font-mono">admin@smartmess.app</code> / <code className="font-mono">admin123</code>
              </p>
              <p>
                Manager → <code className="font-mono">manager@smartmess.app</code> / <code className="font-mono">manager123</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Smart Mess. All rights reserved.
        </p>
      </div>
    </div>
  )
}
