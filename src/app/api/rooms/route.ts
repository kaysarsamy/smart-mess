// Rooms API — list floors with rooms/seats/occupant, create room.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, handleError } from '@/lib/auth'
import { ROOM_TYPE } from '@/lib/types'

const CreateRoomBody = z.object({
  name: z.string().trim().min(1).max(120),
  floorId: z.string().min(1),
  type: z
    .enum([ROOM_TYPE.SINGLE, ROOM_TYPE.DOUBLE, ROOM_TYPE.TRIPLE, ROOM_TYPE.SHARED])
    .default(ROOM_TYPE.SHARED),
  monthlyRent: z.number().nonnegative().default(5500),
})

export async function GET() {
  try {
    await requireUser()
    const floors = await db.floor.findMany({
      orderBy: { level: 'asc' },
      include: {
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            seats: {
              orderBy: { label: 'asc' },
              include: {
                assignments: {
                  where: { active: true },
                  include: {
                    student: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    const payload = floors.map((f) => ({
      id: f.id,
      name: f.name,
      level: f.level,
      rooms: f.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        monthlyRent: r.monthlyRent,
        seats: r.seats.map((s) => {
          const current = s.assignments[0]
          return {
            id: s.id,
            label: s.label,
            occupied: s.assignments.length > 0,
            student: current?.student ?? null,
          }
        }),
      })),
    }))
    return Response.json({ floors: payload })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const json = await req.json().catch(() => ({}))
    const parsed = CreateRoomBody.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { error: 'INVALID', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { name, floorId, type, monthlyRent } = parsed.data

    const floor = await db.floor.findUnique({ where: { id: floorId } })
    if (!floor) {
      return Response.json({ error: 'FLOOR_NOT_FOUND' }, { status: 404 })
    }

    const existing = await db.room.findUnique({ where: { name } })
    if (existing) {
      return Response.json({ error: 'ROOM_NAME_TAKEN' }, { status: 409 })
    }

    const room = await db.room.create({
      data: { name, floorId, type, monthlyRent },
      select: {
        id: true,
        name: true,
        floorId: true,
        type: true,
        monthlyRent: true,
        createdAt: true,
      },
    })
    return Response.json(room, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
