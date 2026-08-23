import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SCENARIO_CARD_SELECT, withScenarioAuthor } from '@/lib/scenarioVisibility'

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const scenarios = await prisma.scenario.findMany({
      where: { visibility: 'PUBLIC', author: { followers: { some: { followerId: userId } } } },
      select: SCENARIO_CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(scenarios.map(withScenarioAuthor))
  } catch (err) {
    console.error('Failed to load subscription feed:', err)
    return NextResponse.json({ error: 'Could not load subscriptions' }, { status: 500 })
  }
}
