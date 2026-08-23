import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { canViewScenario, type ScenarioVisibilityValue } from '@/lib/scenarioVisibility'

// A generous ceiling so the history page and the viewer's best-score lookup
// share one endpoint without either being able to pull the whole table.
const MAX_ROWS = 200

/** Row shape both the history page and the viewer read. */
function toAttemptResponse(row: {
  id: string
  scenarioTitle: string
  score: number
  maxScore: number
  completedAt: Date
  scenario: { id: string; title: string; visibility: ScenarioVisibilityValue; authorId: string | null } | null
}, userId: string) {
  // The snapshot is only a fallback: while the scenario still exists its
  // current title wins, so a rename is reflected in your history.
  const available = row.scenario !== null
  const linkable = row.scenario !== null
    && canViewScenario(row.scenario, userId)

  return {
    id: row.id,
    title: row.scenario?.title ?? row.scenarioTitle,
    // Null whenever following the link would dead-end: the scenario is gone,
    // or it is someone else's unpublished draft.
    scenarioId: linkable ? row.scenario!.id : null,
    available,
    score: row.score,
    maxScore: row.maxScore,
    completedAt: row.completedAt,
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // `?scenarioId=` narrows to one scenario — that is how the viewer reads
    // your best score without a second endpoint.
    const scenarioId = new URL(req.url).searchParams.get('scenarioId')

    const attempts = await prisma.attempt.findMany({
      where: { userId, ...(scenarioId ? { scenarioId } : {}) },
      select: {
        id: true,
        scenarioTitle: true,
        score: true,
        maxScore: true,
        completedAt: true,
        scenario: { select: { id: true, title: true, visibility: true, authorId: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: MAX_ROWS,
    })

    return NextResponse.json(attempts.map(a => toAttemptResponse(a, userId)))
  } catch (err) {
    console.error('Failed to list attempts:', err)
    return NextResponse.json({ error: 'Failed to load your history' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = await req.json()
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : ''
    const { score, maxScore } = body

    if (!scenarioId) {
      return NextResponse.json({ error: 'Missing scenarioId' }, { status: 400 })
    }
    if (
      !Number.isInteger(score) || !Number.isInteger(maxScore) ||
      score < 0 || maxScore < 0 || score > maxScore
    ) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    // Read the flag server-side rather than trusting the client: pausing
    // history has to hold even if the request is made by hand.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { historyEnabled: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    if (!user.historyEnabled) {
      // Not an error: recording is paused, so this playthrough is skipped.
      // Past rows are untouched.
      return NextResponse.json({ recorded: false, reason: 'paused' })
    }

    // The title snapshot comes from the database, never the request body.
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, title: true, visibility: true, authorId: true },
    })
    if (!scenario || !canViewScenario(scenario, userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        score,
        maxScore,
      },
      select: { id: true, score: true, maxScore: true, completedAt: true },
    })

    return NextResponse.json({ recorded: true, attempt }, { status: 201 })
  } catch (err) {
    console.error('Failed to record attempt:', err)
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 })
  }
}

/** Clear all history for the signed-in user. */
export async function DELETE() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { count } = await prisma.attempt.deleteMany({ where: { userId } })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error('Failed to clear history:', err)
    return NextResponse.json({ error: 'Could not clear your history' }, { status: 500 })
  }
}
