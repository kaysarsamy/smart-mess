// NextAuth v4 config — Credentials provider, RBAC with ADMIN/MANAGER roles.

import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ROLE, type Role, type AppUser } from '@/lib/types'

// Demo seeding-safe default credentials are documented in /prisma/seed.ts
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' as const, maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@smartmess.app' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password ?? ''
        if (!email || !password) return null
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null
        if (!user.active) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as Role,
          phone: user.phone ?? null,
        } as unknown as AppUser & { id: string }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AppUser & { id: string }
        token.id = u.id
        token.role = u.role
        token.phone = u.phone ?? null
      }
      return token
    },
    async session({ session, token }) {
      const appUser: AppUser = {
        id: (token.id as string) ?? '',
        name: (token.name as string) ?? '',
        email: (token.email as string) ?? '',
        role: (token.role as Role) ?? ROLE.MANAGER,
        phone: (token.phone as string | null) ?? null,
      }
      session.user = appUser
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'smart-mess-dev-secret-change-me',
}

/// Server-side: current user or null. Never throws.
export async function getSession(): Promise<AppUser | null> {
  const { getServerSession } = await import('next-auth')
  const session = await getServerSession(authOptions)
  return (session?.user as AppUser | undefined) ?? null
}

/// Require a logged-in user; throws Response-like error if missing.
export async function requireUser(): Promise<AppUser> {
  const user = await getSession()
  if (!user) {
    const err = new Error('UNAUTHORIZED') as Error & { status?: number }
    err.status = 401
    throw err
  }
  return user
}

/// Require an Admin user; throws if not admin.
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser()
  if (user.role !== ROLE.ADMIN) {
    const err = new Error('FORBIDDEN') as Error & { status?: number }
    err.status = 403
    throw err
  }
  return user
}

/// Convert errors from requireUser/requireAdmin into a Next.js Response.
export function handleError(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'INTERNAL'
  const status =
    message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500
  return Response.json({ error: message }, { status })
}
