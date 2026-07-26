import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { SCENARIO_CARD_SELECT } from '@/lib/scenarioVisibility'
import { toSavedScenario } from '../../bookmarks/route'
import { validatePlaylistDescription, validatePlaylistName } from '../route'

/**
 * Ownership check shared by every handler here, in the same 404-then-403 shape
 * the scenario routes use. Public playlists are deliberately NOT readable by
 * other users yet — the flag is stored but nothing grants access on it.
 */
async function requireOwnPlaylist(id: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!playlist) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (playlist.userId !== userId) {
    return { error: NextResponse.json({ error: 'Not your playlist' }, { status: 403 }) }
  }
  return { ok: true as const }
}

export async function GET(
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

    const guard = await requireOwnPlaylist(id, userId)
    if ('error' in guard) return guard.error

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        public: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            scenarioId: true,
            scenarioTitle: true,
            addedAt: true,
            scenario: { select: SCENARIO_CARD_SELECT },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })
    if (!playlist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      public: playlist.public,
      updatedAt: playlist.updatedAt,
      items: playlist.items.map(item => ({
        id: item.id,
        scenarioId: item.scenarioId,
        addedAt: item.addedAt,
        ...toSavedScenario(item, userId),
      })),
    })
  } catch (err) {
    console.error('Failed to load playlist:', err)
    return NextResponse.json({ error: 'Failed to load this playlist' }, { status: 500 })
  }
}

export async function PATCH(
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

    const guard = await requireOwnPlaylist(id, userId)
    if ('error' in guard) return guard.error

    const body = await req.json()
    const data: { name?: string; description?: string | null; public?: boolean } = {}

    // Each field validated only when supplied, so the detail view can PATCH
    // just { public } without resending the name.
    if (body?.name !== undefined) {
      const result = validatePlaylistName(body.name)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
      data.name = result.name
    }
    if (body?.description !== undefined) {
      const result = validatePlaylistDescription(body.description)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
      data.description = result.description
    }
    if (body?.public !== undefined) {
      if (typeof body.public !== 'boolean') {
        return NextResponse.json({ error: 'public must be true or false.' }, { status: 400 })
      }
      data.public = body.public
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const playlist = await prisma.playlist.update({
      where: { id },
      data,
      select: { id: true, name: true, description: true, public: true, updatedAt: true },
    })

    return NextResponse.json(playlist)
  } catch (err) {
    console.error('Failed to update playlist:', err)
    return NextResponse.json({ error: 'Could not update the playlist' }, { status: 500 })
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

    const guard = await requireOwnPlaylist(id, userId)
    if ('error' in guard) return guard.error

    // PlaylistItem cascades from Playlist, so the items go with it.
    await prisma.playlist.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete playlist:', err)
    return NextResponse.json({ error: 'Could not delete the playlist' }, { status: 500 })
  }
}
