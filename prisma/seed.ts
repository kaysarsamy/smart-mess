// Seed Smart Mess database with demo data.
// Run with: bun run db:seed
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)
const PREV_MONTH_DATE = new Date()
PREV_MONTH_DATE.setMonth(PREV_MONTH_DATE.getMonth() - 1)
const PREV_MONTH = PREV_MONTH_DATE.toISOString().slice(0, 7)

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

async function main() {
  console.log('→ seeding Smart Mess…')

  // --- Users ---
  const adminPass = await bcrypt.hash('admin123', 10)
  const managerPass = await bcrypt.hash('manager123', 10)

  const admin = await db.user.upsert({
    where: { email: 'admin@smartmess.app' },
    update: {},
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
    update: {},
    create: {
      name: 'Salman Hossain (Manager)',
      email: 'manager@smartmess.app',
      passwordHash: managerPass,
      role: 'MANAGER',
      phone: '+8801710000002',
      active: true,
    },
  })
  console.log(`  users: ${admin.email}, ${manager.email}`)

  // --- Floors + Rooms + Seats ---
  const floors = [
    { name: '1st Floor', level: 1 },
    { name: '2nd Floor', level: 2 },
    { name: '3rd Floor', level: 3 },
  ]
  const floorRows: { id: string; name: string }[] = []
  for (const f of floors) {
    const row = await db.floor.upsert({
      where: { name: f.name },
      update: {},
      create: f,
    })
    floorRows.push(row)
  }

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
      create: {
        name: spec.name,
        floorId: floor.id,
        type: spec.type,
        monthlyRent: spec.rent,
      },
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
  console.log(`  seats: ${seatRows.length}`)

  // --- Students ---
  type StudentSpec = {
    name: string
    phone: string
    refId: string
    institution: string
    guardian: string
    guardianPhone: string
    deposit: number
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
    { name: 'Imran Khan (former)', phone: '+8801899999999', refId: 'DU-2017-5510', institution: 'University of Dhaka', guardian: 'Khan Jaman', guardianPhone: '+8801999999999', deposit: 0 },
  ]

  const studentRows: { id: string; name: string }[] = []
  let seatCursor = 0
  for (const s of studentSpecs) {
    const former = s.name.includes('(former)')
    const student = await db.student.upsert({
      where: { id: `${slug(s.name)}` }, // deterministic-ish key via create fallback
      update: {},
      create: {
        fullName: s.name.replace(' (former)', ''),
        phone: s.phone,
        studentIdRef: s.refId,
        institution: s.institution,
        guardianName: s.guardian,
        guardianPhone: s.guardianPhone,
        status: former ? 'FORMER' : 'ACTIVE',
        securityDeposit: s.deposit,
      },
    }).catch(async () => {
      return await db.student.create({
        data: {
          fullName: s.name.replace(' (former)', ''),
          phone: s.phone,
          studentIdRef: s.refId,
          institution: s.institution,
          guardianName: s.guardian,
          guardianPhone: s.guardianPhone,
          status: former ? 'FORMER' : 'ACTIVE',
          securityDeposit: s.deposit,
        },
      })
    })
    studentRows.push({ id: student.id, name: student.fullName })

    // Assign current seat (except former)
    if (!former && seatCursor < seatRows.length - 1) {
      const seat = seatRows[seatCursor]
      const moveIn = daysAgo(60)
      await db.seatAssignment.create({
        data: {
          studentId: student.id,
          seatId: seat.id,
          moveInDate: moveIn,
          monthlyRent: 5500,
          active: true,
        },
      })
      seatCursor++
    } else if (former) {
      // Give former a past seat history
      const seat = seatRows[seatRows.length - 1]
      await db.seatAssignment.create({
        data: {
          studentId: student.id,
          seatId: seat.id,
          moveInDate: daysAgo(220),
          moveOutDate: daysAgo(40),
          monthlyRent: 5500,
          active: false,
        },
      })
    }
  }
  console.log(`  students: ${studentRows.length}`)

  // --- Bills (current month + previous) ---
  for (const s of studentRows) {
    if (s.name.includes('(former)')) continue
    for (const month of [PREV_MONTH, CURRENT_MONTH]) {
      const [y, m] = month.split('-').map(Number)
      await db.bill.create({
        data: {
          studentId: s.id,
          month,
          amount: 5500,
          dueDate: new Date(y, m, 10),
        },
      }).catch(() => null)
    }
  }

  // --- Payments (mostly paid for prev month, partial for current) ---
  const methods = ['CASH', 'BKASH', 'NAGAD', 'BANK'] as const
  let pIdx = 0
  for (const s of studentRows) {
    if (s.name.includes('(former)')) continue
    // prev month fully paid
    const prevBill = await db.bill.findUnique({
      where: { studentId_month: { studentId: s.id, month: PREV_MONTH } },
    })
    if (prevBill) {
      await db.payment.create({
        data: {
          billId: prevBill.id,
          studentId: s.id,
          amount: prevBill.amount,
          method: methods[pIdx % methods.length] as string,
          txnRef: pIdx % 2 === 0 ? `TXN${1000 + pIdx}` : null,
          receivedById: manager.id,
          paidAt: daysAgo(15),
        },
      })
      pIdx++
    }
    // current month — some partial
    const curBill = await db.bill.findUnique({
      where: { studentId_month: { studentId: s.id, month: CURRENT_MONTH } },
    })
    if (curBill && pIdx % 3 !== 0) {
      await db.payment.create({
        data: {
          billId: curBill.id,
          studentId: s.id,
          amount: curBill.amount,
          method: methods[(pIdx + 1) % methods.length] as string,
          txnRef: `TXN${2000 + pIdx}`,
          receivedById: admin.id,
          paidAt: daysAgo(2),
        },
      })
    } else if (curBill) {
      // partial — half paid
      await db.payment.create({
        data: {
          billId: curBill.id,
          studentId: s.id,
          amount: 2500,
          method: methods[(pIdx + 2) % methods.length] as string,
          txnRef: `TXN${3000 + pIdx}`,
          receivedById: manager.id,
          paidAt: daysAgo(1),
        },
      })
    }
    pIdx++
  }

  // --- Expenses ---
  const expenses = [
    { category: 'ELECTRICITY', amount: 4200, note: 'Monthly electricity bill', days: 5 },
    { category: 'GAS', amount: 1200, note: 'Gas bill', days: 6 },
    { category: 'WATER', amount: 800, note: 'Water bill', days: 6 },
    { category: 'INTERNET', amount: 1500, note: 'Broadband - Aktel', days: 7 },
    { category: 'SALARY', amount: 9000, note: 'Cook salary', days: 4 },
    { category: 'OTHERS', amount: 600, note: 'Cleaning supplies', days: 3 },
  ] as const
  for (const e of expenses) {
    await db.expense.create({
      data: {
        category: e.category,
        amount: e.amount,
        incurredOn: daysAgo(e.days),
        note: e.note,
        createdById: manager.id,
      },
    })
  }

  // --- Settings ---
  await db.setting.upsert({
    where: { key: 'messName' },
    update: {},
    create: { key: 'messName', value: 'Smart Mess — Mirpur 10' },
  })
  await db.setting.upsert({
    where: { key: 'currency' },
    update: {},
    create: { key: 'currency', value: 'BDT' },
  })

  console.log('✓ seed complete')
  console.log('  login → admin@smartmess.app / admin123')
  console.log('  login → manager@smartmess.app / manager123')
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
