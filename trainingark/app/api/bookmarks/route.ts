import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  canViewScenario,
  SCENARIO_CARD_SELECT,
  toScenarioAuthor,
  type ScenarioVisibilityValue,
} from '@/lib/scenarioVisibility'

/**
 * Shapes a saved row for the UI. Mirrors the attempts route: the live scenario
 * wins while it exists, the snapshot is the fallback once it is gone, and the
 * link is withheld when following it would dead-end.
 */
export function toSavedScenario(
  row: {
    scenarioTitle: string
    scenario: {
      id: string
      title: string
      description: string
      difficulty: string
      commanders: string[]
      updatedAt: Date
      visibility: ScenarioVisibilityValue
      authorId: string | null
      author: { id: string; name: string | null } | null
    } | null
  },
  userId: string
) {
  const s = row.scenario
  const visible = s !== null && canViewScenario(s, userId)

  return {
    available: s !== null,
    title: s?.title ?? row.scenarioTitle,
    // Full card payload only when there is a card to render.
    scenario: visible && s
      ? {
          id: s.id,
          title: s.title,
          description: s.description,
          difficulty: s.difficulty,
          commanders: s.commanders,
          updatedAt: s.updatedAt,
          visibility: s.visibility,
          author: toScenarioAuthor(s.author),
        }
      : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // `?ids=1` is the cheap shape the app-wide provider polls on load: just the
    // scenario ids, enough to decide which bookmark icons render filled.
    if (new URL(req.url).searchParams.get('ids') === '1') {
      const rows = await prisma.bookmark.findMany({
        where: { userId, scenarioId: { not: null } },
        select: { scenarioId: true },
      })
      return NextResponse.json(rows.map(r => r.scenarioId))
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: {
        id: true,
        scenarioId: true,
        scenarioTitle: true,
        createdAt: true,
        scenario: { select: SCENARIO_CARD_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bookmarks.map(b => ({
      id: b.id,
      scenarioId: b.scenarioId,
      createdAt: b.createdAt,
      ...toSavedScenario(b, userId),
    })))
  } catch (err) {
    console.error('Failed to list bookmarks:', err)
    return NextResponse.json({ error: 'Failed to load your bookmarks' }, { status: 500 })
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
    if (!scenarioId) {
      return NextResponse.json({ error: 'Missing scenarioId' }, { status: 400 })
    }

    // Title snapshot comes from the database, never the request body.
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, title: true, visibility: true, authorId: true },
    })
    if (!scenario || !canViewScenario(scenario, userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Bookmarking is a toggle, so saving twice is a no-op rather than an error
    // or a duplicate row. The unique index on (userId, scenarioId) backs this.
    const bookmark = await prisma.bookmark.upsert({
      where: { userId_scenarioId: { userId, scenarioId: scenario.id } },
      create: { userId, scenarioId: scenario.id, scenarioTitle: scenario.title },
      update: { scenarioTitle: scenario.title },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({ bookmarked: true, bookmark }, { status: 201 })
  } catch (err) {
    console.error('Failed to save bookmark:', err)
    return NextResponse.json({ error: 'Could not save this scenario' }, { status: 500 })
  }
}
