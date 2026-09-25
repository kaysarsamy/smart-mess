// Extend the Session type with role & id.
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: 'ADMIN' | 'MANAGER'
      phone?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'ADMIN' | 'MANAGER'
    phone?: string | null
  }
}
