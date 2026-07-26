import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  try {
    const { id, scenarioId } = await params

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!playlist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (playlist.userId !== userId) {
      return NextResponse.json({ error: 'Not your playlist' }, { status: 403 })
    }

    // Matching on either id lets this route also remove an orphaned entry,
    // whose scenarioId is null once the scenario is deleted — the detail view
    // passes the item's own id in that case. Scoped to this playlist, which
    // was just proven to belong to the caller.
    //
    // deleteMany rather than delete keeps removal idempotent.
    const { count } = await prisma.playlistItem.deleteMany({
      where: { playlistId: id, OR: [{ scenarioId }, { id: scenarioId }] },
    })

    await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } })

    return NextResponse.json({ contains: false, removed: count })
  } catch (err) {
    console.error('Failed to remove from playlist:', err)
    return NextResponse.json({ error: 'Could not remove from that playlist' }, { status: 500 })
  }
}
