import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(
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

    const body = await req.json()
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : ''
    if (!scenarioId) {
      return NextResponse.json({ error: 'Missing scenarioId' }, { status: 400 })
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, title: true },
    })
    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Adding twice is a no-op, backed by the unique index on
    // (playlistId, scenarioId) — the popover checkbox stays idempotent.
    await prisma.playlistItem.upsert({
      where: { playlistId_scenarioId: { playlistId: id, scenarioId: scenario.id } },
      create: { playlistId: id, scenarioId: scenario.id, scenarioTitle: scenario.title },
      update: { scenarioTitle: scenario.title },
    })

    // Touch the playlist so the dashboard's most-recent-first ordering reflects
    // the change (updatedAt is @updatedAt, so it needs a write to move).
    await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } })

    return NextResponse.json({ contains: true }, { status: 201 })
  } catch (err) {
    console.error('Failed to add to playlist:', err)
    return NextResponse.json({ error: 'Could not add to that playlist' }, { status: 500 })
  }
}
