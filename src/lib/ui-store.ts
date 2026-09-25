// Global UI store: active module + cross-module navigation intent.
import { create } from 'zustand'
import { type ModuleId } from '@/lib/nav'

interface PendingPayment {
  studentId: string
  billId: string | null
  month: string // "YYYY-MM"
}

interface UIState {
  activeModule: ModuleId
  /** Switch the active module. */
  setModule: (m: ModuleId) => void
  /** Pending payment context (e.g. dashboard "Collect" → billing pre-fills form). */
  pendingPayment: PendingPayment | null
  startPayment: (p: PendingPayment) => void
  clearPendingPayment: () => void
  /** Pending student create (e.g. dashboard "Add student" → opens students add dialog). */
  wantAddStudent: boolean
  requestAddStudent: () => void
  consumeAddStudent: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeModule: 'dashboard',
  setModule: (activeModule) => set({ activeModule }),
  pendingPayment: null,
  startPayment: (pendingPayment) => set({ pendingPayment, activeModule: 'billing' }),
  clearPendingPayment: () => set({ pendingPayment: null }),
  wantAddStudent: false,
  requestAddStudent: () => set({ wantAddStudent: true, activeModule: 'students' }),
  consumeAddStudent: () => set({ wantAddStudent: false }),
}))
