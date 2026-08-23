import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  parseScenarioVisibility,
  SCENARIO_CARD_SELECT,
  ownScenarioWhere,
  visibleScenarioWhere,
  withScenarioAuthor,
} from '@/lib/scenarioVisibility'
import { isFirstPublication } from '@/lib/subscription'

const MAX_PAYLOAD_BYTES = 8_000_000
const MAX_COMMANDERS = 8

function sanitizeCommanders(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .slice(0, MAX_COMMANDERS)
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data, commanders } = body
    const visibility = body.visibility === undefined
      ? 'DRAFT'
      : parseScenarioVisibility(body.visibility)

    if (!title || !data) {
      return NextResponse.json({ error: 'Missing title or data' }, { status: 400 })
    }
    if (!visibility) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
    }

    const scenario = await prisma.$transaction(async tx => {
      const created = await tx.scenario.create({
        data: {
          title,
          description: description ?? '',
          difficulty: difficulty ?? 'beginner',
          commanders: sanitizeCommanders(commanders),
          visibility,
          publishedAt: visibility === 'PUBLIC' ? new Date() : null,
          data,
          authorId: userId,
        },
      })
      if (isFirstPublication(null, visibility)) {
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
              scenarioId: created.id,
              scenarioTitle: created.title,
            })),
          })
        }
      }
      return created
    })

    return NextResponse.json({ id: scenario.id, authorId: scenario.authorId }, { status: 201 })
  } catch (err) {
    console.error('Failed to create scenario:', err)
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    // `?mine=1` is what the builder and dashboard use for creator-only content.
    // The plain list is discovery-only and therefore contains public scenarios.
    const mineOnly = new URL(req.url).searchParams.get('mine') === '1'
    if (mineOnly && !userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // Visibility rules live in lib/scenarioVisibility.ts so the search
    // endpoint applies the same definitions rather than its own copy.
    const where = mineOnly && userId
      ? ownScenarioWhere(userId)
      : visibleScenarioWhere(userId)

    const scenarios = await prisma.scenario.findMany({
      where,
      select: SCENARIO_CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(scenarios.map(withScenarioAuthor))
  } catch (err) {
    console.error('Failed to list scenarios:', err)
    return NextResponse.json({ error: 'Failed to list scenarios' }, { status: 500 })
  }
}
