// Shared, idempotent seed logic — used by `prisma/seed.ts` (CLI) and by the
// `/api/setup/seed` route (production, post-deploy). Takes a Prisma client.
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'

export interface SeedSummary {
  users: number
  floors: number
  rooms: number
  seats: number
  students: number
  assignments: number
  bills: number
  payments: number
  expenses: number
  settings: number
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function runSeed(db: PrismaClient): Promise<SeedSummary> {
  const CURRENT_MONTH = monthKey(new Date())
  const prevDate = new Date()
  prevDate.setMonth(prevDate.getMonth() - 1)
  const PREV_MONTH = monthKey(prevDate)

  const summary: SeedSummary = {
    users: 0, floors: 0, rooms: 0, seats: 0, students: 0,
    assignments: 0, bills: 0, payments: 0, expenses: 0, settings: 0,
  }

  // --- Users (idempotent by email) ---
  const adminPass = await bcrypt.hash('admin123', 10)
  const managerPass = await bcrypt.hash('manager123', 10)
  const admin = await db.user.upsert({
    where: { email: 'admin@smartmess.app' },
    update: { passwordHash: adminPass, role: 'ADMIN', active: true },
    create: {
      name: 'Rakib Ahmed (Admin)',
      email: 'admin@smartmess.app',
      passwordHash: adminPass,
      role: 'ADMIN',
      phone: '+8801710000001',
      active: true,
    },
  })
  const manager = await db.user.upsert({
    where: { email: 'manager@smartmess.app' },
    update: { passwordHash: managerPass, role: 'MANAGER', active: true },
    create: {
      name: 'Salman Hossain (Manager)',
      email: 'manager@smartmess.app',
      passwordHash: managerPass,
      role: 'MANAGER',
      phone: '+8801710000002',
      active: true,
    },
  })
  summary.users = await db.user.count()

  // --- Floors (idempotent by name) ---
  const floorSpecs = [
    { name: '1st Floor', level: 1 },
    { name: '2nd Floor', level: 2 },
    { name: '3rd Floor', level: 3 },
  ]
  const floorRows: { id: string; name: string }[] = []
  for (const f of floorSpecs) {
    floorRows.push(await db.floor.upsert({
      where: { name: f.name },
      update: {},
      create: f,
    }))
  }
  summary.floors = await db.floor.count()

  // --- Rooms + seats ---
  type RoomSpec = { floor: string; name: string; type: string; rent: number; seats: string[] }
  const roomSpecs: RoomSpec[] = [
    { floor: '1st Floor', name: 'Room 101', type: 'Shared', rent: 5500, seats: ['A', 'B', 'C', 'D'] },
    { floor: '1st Floor', name: 'Room 102', type: 'Triple', rent: 6000, seats: ['A', 'B', 'C'] },
    { floor: '2nd Floor', name: 'Room 201', type: 'Double', rent: 7000, seats: ['A', 'B'] },
    { floor: '2nd Floor', name: 'Room 202', type: 'Shared', rent: 5500, seats: ['A', 'B', 'C', 'D'] },
    { floor: '3rd Floor', name: 'Room 301', type: 'Single', rent: 9000, seats: ['A'] },
    { floor: '3rd Floor', name: 'Room 302', type: 'Shared', rent: 5500, seats: ['A', 'B', 'C', 'D'] },
  ]
  const seatRows: { id: string; label: string; roomName: string }[] = []
  for (const spec of roomSpecs) {
    const floor = floorRows.find((f) => f.name === spec.floor)!
    const room = await db.room.upsert({
      where: { name: spec.name },
      update: {},
      create: { name: spec.name, floorId: floor.id, type: spec.type, monthlyRent: spec.rent },
    })
    for (const label of spec.seats) {
      const seat = await db.seat.upsert({
        where: { roomId_label: { roomId: room.id, label } },
        update: {},
        create: { roomId: room.id, label },
      })
      seatRows.push({ id: seat.id, label, roomName: room.name })
    }
  }
  summary.rooms = await db.room.count()
  summary.seats = await db.seat.count()

  // --- Students (idempotent by phone) ---
  type StudentSpec = {
    name: string; phone: string; refId: string; institution: string
    guardian: string; guardianPhone: string; deposit: number; former?: boolean
  }
  const studentSpecs: StudentSpec[] = [
    { name: 'Tanvir Rahman', phone: '+8801811111111', refId: 'DU-2021-1180', institution: 'University of Dhaka', guardian: 'Mohammad Rahman', guardianPhone: '+8801911111111', deposit: 5000 },
    { name: 'Sadia Islam', phone: '+8801822222222', refId: 'DU-2020-2041', institution: 'University of Dhaka', guardian: 'Islam Ali', guardianPhone: '+8801922222222', deposit: 5000 },
    { name: 'Mehedi Hasan', phone: '+8801833333333', refId: 'JU-2019-3370', institution: 'Jahangirnagar University', guardian: 'Hasan Ali', guardianPhone: '+8801933333333', deposit: 5500 },
    { name: 'Fahim Chowdhury', phone: '+8801844444444', refId: 'BUET-2022-0190', institution: 'BUET', guardian: 'Chowdhury Bari', guardianPhone: '+8801944444444', deposit: 6000 },
    { name: 'Nusrat Jahan', phone: '+8801855555555', refId: 'DU-2021-1195', institution: 'University of Dhaka', guardian: 'Jahan Khan', guardianPhone: '+8801955555555', deposit: 5000 },
    { name: 'Rifat Hossain', phone: '+8801866666666', refId: 'SUST-2020-2210', institution: 'SUST', guardian: 'Hossain Mia', guardianPhone: '+8801966666666', deposit: 5500 },
    { name: 'Ariful Islam', phone: '+8801877777777', refId: 'DU-2018-4521', institution: 'University of Dhaka', guardian: 'Islam Uddin', guardianPhone: '+8801977777777', deposit: 4500 },
    { name: 'Tania Akter', phone: '+8801888888888', refId: 'JU-2021-3350', institution: 'Jahangirnagar University', guardian: 'Akter Mia', guardianPhone: '+8801988888888', deposit: 5000 },
    { name: 'Imran Khan', phone: '+8801899999999', refId: 'DU-2017-5510', institution: 'University of Dhaka', guardian: 'Khan Jaman', guardianPhone: '+8801999999999', deposit: 0, former: true },
  ]
  const studentRows: { id: string; name: string; former: boolean }[] = []
  let seatCursor = 0
  for (const s of studentSpecs) {
    // Idempotent: find by phone, else create
    let student = await db.student.findFirst({ where: { phone: s.phone } })
    if (!student) {
      student = await db.student.create({
        data: {
          fullName: s.name,
          phone: s.phone,
          studentIdRef: s.refId,
          institution: s.institution,
          guardianName: s.guardian,
          guardianPhone: s.guardianPhone,
          status: s.former ? 'FORMER' : 'ACTIVE',
          securityDeposit: s.deposit,
        },
      })
    }
    studentRows.push({ id: student.id, name: student.fullName, former: !!s.former })

    if (!s.former && seatCursor < seatRows.length) {
      const seat = seatRows[seatCursor]
      const existing = await db.seatAssignment.findFirst({
        where: { studentId: student.id, active: true },
      })
      if (!existing) {
        await db.seatAssignment.create({
          data: { studentId: student.id, seatId: seat.id, moveInDate: daysAgo(60), monthlyRent: 5500, active: true },
        })
      }
      seatCursor++
    } else if (s.former) {
      const seat = seatRows[seatRows.length - 1]
      const existing = await db.seatAssignment.findFirst({
        where: { studentId: student.id, seatId: seat.id },
      })
      if (!existing) {
        await db.seatAssignment.create({
          data: { studentId: student.id, seatId: seat.id, moveInDate: daysAgo(220), moveOutDate: daysAgo(40), monthlyRent: 5500, active: false },
        })
      }
    }
  }
  summary.students = await db.student.count()
  summary.assignments = await db.seatAssignment.count()

  // --- Bills (current + prev month) — idempotent by (studentId, month) ---
  for (const s of studentRows) {
    if (s.former) continue
    for (const month of [PREV_MONTH, CURRENT_MONTH]) {
      const [y, m] = month.split('-').map(Number)
      const existing = await db.bill.findUnique({ where: { studentId_month: { studentId: s.id, month } } })
      if (!existing) {
        await db.bill.create({
          data: { studentId: s.id, month, amount: 5500, dueDate: new Date(y, m, 10) },
        })
      }
    }
  }
  summary.bills = await db.bill.count()

  // --- Payments (idempotent by billId+amount+method-ish: just check a payment exists for the bill) ---
  const methods = ['CASH', 'BKASH', 'NAGAD', 'BANK'] as const
  let pIdx = 0
  for (const s of studentRows) {
    if (s.former) continue
    const prevBill = await db.bill.findUnique({ where: { studentId_month: { studentId: s.id, month: PREV_MONTH } } })
    if (prevBill) {
      const hasPrevPayment = await db.payment.findFirst({ where: { billId: prevBill.id } })
      if (!hasPrevPayment) {
        await db.payment.create({
          data: { billId: prevBill.id, studentId: s.id, amount: prevBill.amount, method: methods[pIdx % methods.length] as string, txnRef: pIdx % 2 === 0 ? `TXN${1000 + pIdx}` : null, receivedById: manager.id, paidAt: daysAgo(15) },
        })
      }
      pIdx++
    }
    const curBill = await db.bill.findUnique({ where: { studentId_month: { studentId: s.id, month: CURRENT_MONTH } } })
    if (curBill) {
      const hasCurPayment = await db.payment.findFirst({ where: { billId: curBill.id } })
      if (!hasCurPayment && pIdx % 3 !== 0) {
        await db.payment.create({ data: { billId: curBill.id, studentId: s.id, amount: curBill.amount, method: methods[(pIdx + 1) % methods.length] as string, txnRef: `TXN${2000 + pIdx}`, receivedById: admin.id, paidAt: daysAgo(2) } })
      } else if (!hasCurPayment) {
        await db.payment.create({ data: { billId: curBill.id, studentId: s.id, amount: 2500, method: methods[(pIdx + 2) % methods.length] as string, txnRef: `TXN${3000 + pIdx}`, receivedById: manager.id, paidAt: daysAgo(1) } })
      }
    }
    pIdx++
  }
  summary.payments = await db.payment.count()

  // --- Expenses (idempotent by note) ---
  const expenses = [
    { category: 'ELECTRICITY', amount: 4200, note: 'Monthly electricity bill', days: 5 },
    { category: 'GAS', amount: 1200, note: 'Gas bill', days: 6 },
    { category: 'WATER', amount: 800, note: 'Water bill', days: 6 },
    { category: 'INTERNET', amount: 1500, note: 'Broadband - Aktel', days: 7 },
    { category: 'SALARY', amount: 9000, note: 'Cook salary', days: 4 },
    { category: 'OTHERS', amount: 600, note: 'Cleaning supplies', days: 3 },
  ] as const
  for (const e of expenses) {
    const existing = await db.expense.findFirst({ where: { note: e.note } })
    if (!existing) {
      await db.expense.create({ data: { category: e.category, amount: e.amount, incurredOn: daysAgo(e.days), note: e.note, createdById: manager.id } })
    }
  }
  summary.expenses = await db.expense.count()

  // --- Settings ---
  await db.setting.upsert({ where: { key: 'messName' }, update: {}, create: { key: 'messName', value: 'Smart Mess — Mirpur 10' } })
  await db.setting.upsert({ where: { key: 'currency' }, update: {}, create: { key: 'currency', value: 'BDT' } })
  summary.settings = await db.setting.count()

  return summary
}
