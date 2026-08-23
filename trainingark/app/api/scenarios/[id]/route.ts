import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { canViewScenario, parseScenarioVisibility } from '@/lib/scenarioVisibility'
import { isFirstPublication } from '@/lib/subscription'

const MAX_PAYLOAD_BYTES = 8_000_000
const MAX_COMMANDERS = 8

function sanitizeCommanders(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .slice(0, MAX_COMMANDERS)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scenario = await prisma.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Drafts are visible to their author only. Unlisted scenarios work for
    // anyone with the URL but never enter discovery surfaces.
    if (scenario.visibility === 'DRAFT') {
      const session = await auth()
      if (!canViewScenario(scenario, session?.user?.id)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    return NextResponse.json(scenario)
  } catch (err) {
    console.error('Failed to fetch scenario:', err)
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const existing = await prisma.scenario.findUnique({
      where: { id },
      select: { authorId: true, visibility: true, publishedAt: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Pre-auth scenarios have authorId null and are deliberately not claimable
    // here — they must be assigned an author directly in the database.
    if (existing.authorId !== userId) {
      return NextResponse.json({ error: 'Not your scenario' }, { status: 403 })
    }

    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data, commanders } = body
    const visibility = body.visibility === undefined
      ? undefined
      : parseScenarioVisibility(body.visibility)
    if (body.visibility !== undefined && !visibility) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
    }

    const nextVisibility = visibility ?? existing.visibility
    const firstPublication = isFirstPublication(existing.publishedAt, nextVisibility)

    const scenario = await prisma.$transaction(async tx => {
      const updated = await tx.scenario.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(difficulty !== undefined && { difficulty }),
          ...(commanders !== undefined && { commanders: sanitizeCommanders(commanders) }),
          ...(data !== undefined && { data }),
          ...(visibility && { visibility }),
          ...(firstPublication && { publishedAt: new Date() }),
        },
      })
      if (firstPublication) {
        const followers = await tx.follow.findMany({
          where: { followingId: userId },
          select: { followerId: true },
        })
        if (followers.length > 0) {
          await tx.notification.createMany({
            data: followers.map(({ followerId }) => ({
              userId: followerId,
              actorId: userId,
              type: 'SCENARIO_PUBLISHED' as const,
              scenarioId: updated.id,
              scenarioTitle: updated.title,
            })),
          })
        }
      }
      return updated
    })

    return NextResponse.json({
      id: scenario.id,
      visibility: scenario.visibility,
      authorId: scenario.authorId,
    })
  } catch (err) {
    console.error('Failed to update scenario:', err)
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const existing = await prisma.scenario.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.authorId !== userId) {
      return NextResponse.json({ error: 'Not your scenario' }, { status: 403 })
    }

    // Events reference the scenario with a required FK and no cascade, so
    // they go first.
    await prisma.$transaction([
      prisma.event.deleteMany({ where: { scenarioId: id } }),
      prisma.scenario.delete({ where: { id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete scenario:', err)
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 })
  }
}
