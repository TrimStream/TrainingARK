import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { canViewScenario } from '@/lib/scenarioVisibility'
import {
  buildScenarioReactionSummary,
  parseScenarioReaction,
  type ScenarioReactionValue,
} from '@/lib/scenarioReaction'

async function canAccessScenario(scenarioId: string, userId?: string): Promise<boolean> {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    select: { visibility: true, authorId: true },
  })
  return scenario !== null && canViewScenario(scenario, userId)
}

async function getSummary(scenarioId: string, userId?: string) {
  const [groups, ownReaction] = await Promise.all([
    prisma.scenarioReaction.groupBy({
      by: ['type'],
      where: { scenarioId },
      _count: { _all: true },
    }),
    userId
      ? prisma.scenarioReaction.findUnique({
          where: { userId_scenarioId: { userId, scenarioId } },
          select: { type: true },
        })
      : null,
  ])

  return buildScenarioReactionSummary(
    groups.map(group => ({
      type: group.type as ScenarioReactionValue,
      count: group._count._all,
    })),
    ownReaction ? ownReaction.type as ScenarioReactionValue : null
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    const userId = session?.user?.id
    if (!await canAccessScenario(id, userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(await getSummary(id, userId))
  } catch (err) {
    console.error('Failed to load scenario reactions:', err)
    return NextResponse.json({ error: 'Could not load reactions' }, { status: 500 })
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
    if (!await canAccessScenario(id, userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const type = parseScenarioReaction(body?.type)
    if (!type) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
    }

    await prisma.scenarioReaction.upsert({
      where: { userId_scenarioId: { userId, scenarioId: id } },
      create: { userId, scenarioId: id, type },
      update: { type },
    })

    return NextResponse.json(await getSummary(id, userId))
  } catch (err) {
    console.error('Failed to update scenario reaction:', err)
    return NextResponse.json({ error: 'Could not update reaction' }, { status: 500 })
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

    await prisma.scenarioReaction.deleteMany({ where: { userId, scenarioId: id } })
    return NextResponse.json(await getSummary(id, userId))
  } catch (err) {
    console.error('Failed to remove scenario reaction:', err)
    return NextResponse.json({ error: 'Could not remove reaction' }, { status: 500 })
  }
}
