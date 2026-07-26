import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // Matching on either id lets the same route remove an orphaned bookmark,
    // whose scenarioId is null once the scenario is deleted — the dashboard
    // passes the bookmark's own id in that case. Both are cuids and the query
    // is scoped to this user, so there is nothing ambiguous to hit.
    //
    // deleteMany rather than delete: un-bookmarking something already gone is a
    // no-op rather than a 404, which keeps the toggle idempotent.
    const { count } = await prisma.bookmark.deleteMany({
      where: { userId, OR: [{ scenarioId }, { id: scenarioId }] },
    })

    return NextResponse.json({ bookmarked: false, removed: count })
  } catch (err) {
    console.error('Failed to remove bookmark:', err)
    return NextResponse.json({ error: 'Could not remove this bookmark' }, { status: 500 })
  }
}
