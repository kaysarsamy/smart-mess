// Shared domain types & enums (string-backed for SQLite compatibility)

export const ROLE = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
} as const
export type Role = (typeof ROLE)[keyof typeof ROLE]

export const STUDENT_STATUS = {
  ACTIVE: 'ACTIVE',
  FORMER: 'FORMER',
} as const
export type StudentStatus = (typeof STUDENT_STATUS)[keyof typeof STUDENT_STATUS]

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  BKASH: 'BKASH',
  NAGAD: 'NAGAD',
  BANK: 'BANK',
} as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

export const EXPENSE_CATEGORY = {
  ELECTRICITY: 'ELECTRICITY',
  GAS: 'GAS',
  WATER: 'WATER',
  INTERNET: 'INTERNET',
  SALARY: 'SALARY',
  OTHERS: 'OTHERS',
} as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY]

export const ROOM_TYPE = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  SHARED: 'Shared',
} as const
export type RoomType = (typeof ROOM_TYPE)[keyof typeof ROOM_TYPE]

export const BILL_STATUS = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
} as const
export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS]

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK: 'Bank',
}

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  ELECTRICITY: 'Electricity',
  GAS: 'Gas',
  WATER: 'Water',
  INTERNET: 'Internet',
  SALARY: 'Salary',
  OTHERS: 'Others',
}

export const roleLabel: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  phone?: string | null
}
