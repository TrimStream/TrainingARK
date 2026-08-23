import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCommentBody, toPublicScenarioComment } from '@/lib/scenarioComment'
import { canViewScenario } from '@/lib/scenarioVisibility'

const COMMENT_SELECT = {
  id: true,
  body: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true } },
} as const

async function canAccessScenario(scenarioId: string, userId?: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    select: { visibility: true, authorId: true },
  })
  return scenario !== null && canViewScenario(scenario, userId)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!await canAccessScenario(id, session?.user?.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const comments = await prisma.scenarioComment.findMany({
      where: { scenarioId: id, status: { not: 'REMOVED' } },
      orderBy: { createdAt: 'asc' },
      select: COMMENT_SELECT,
    })
    return NextResponse.json({ comments: comments.map(toPublicScenarioComment) })
  } catch (err) {
    console.error('Failed to load scenario comments:', err)
    return NextResponse.json({ error: 'Could not load comments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!await canAccessScenario(id, userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const parsed = normalizeCommentBody((await req.json())?.body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const comment = await prisma.scenarioComment.create({
      data: { scenarioId: id, userId, body: parsed.value },
      select: COMMENT_SELECT,
    })
    return NextResponse.json({ comment: toPublicScenarioComment(comment) }, { status: 201 })
  } catch (err) {
    console.error('Failed to add scenario comment:', err)
    return NextResponse.json({ error: 'Could not add comment' }, { status: 500 })
  }
}
