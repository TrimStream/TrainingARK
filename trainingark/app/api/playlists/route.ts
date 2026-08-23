import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { canViewScenario } from '@/lib/scenarioVisibility'

export const MAX_NAME_LENGTH = 60
export const MAX_DESCRIPTION_LENGTH = 300

/** Shared by this route and the detail route so validation cannot drift. */
export function validatePlaylistName(input: unknown): { name: string } | { error: string } {
  const name = typeof input === 'string' ? input.trim() : ''
  if (name.length === 0) return { error: 'Playlist name is required.' }
  if (name.length > MAX_NAME_LENGTH) {
    return { error: `Playlist name must be ${MAX_NAME_LENGTH} characters or fewer.` }
  }
  return { name }
}

export function validatePlaylistDescription(input: unknown): { description: string | null } | { error: string } {
  if (input === undefined || input === null) return { description: null }
  const description = typeof input === 'string' ? input.trim() : ''
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` }
  }
  return { description: description.length > 0 ? description : null }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // `?scenarioId=` adds a `contains` flag per playlist so the add-to-playlist
    // popover can render its checkboxes from a single request.
    const scenarioId = new URL(req.url).searchParams.get('scenarioId')

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        public: true,
        updatedAt: true,
        _count: { select: { items: true } },
        ...(scenarioId
          ? { items: { where: { scenarioId }, select: { id: true }, take: 1 } }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(playlists.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      public: p.public,
      updatedAt: p.updatedAt,
      itemCount: p._count.items,
      contains: scenarioId ? ('items' in p && p.items.length > 0) : undefined,
    })))
  } catch (err) {
    console.error('Failed to list playlists:', err)
    return NextResponse.json({ error: 'Failed to load your playlists' }, { status: 500 })
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

    const nameResult = validatePlaylistName(body?.name)
    if ('error' in nameResult) {
      return NextResponse.json({ error: nameResult.error }, { status: 400 })
    }
    const descResult = validatePlaylistDescription(body?.description)
    if ('error' in descResult) {
      return NextResponse.json({ error: descResult.error }, { status: 400 })
    }

    // Playlists retain their own public/private flag independently of scenario visibility.
    const isPublic = body?.public === true

    // Optional: creating a playlist from the save popover seeds it with the
    // scenario you were looking at.
    const seedId = typeof body?.scenarioId === 'string' ? body.scenarioId : ''
    let seed: {
      id: string
      title: string
      visibility: 'DRAFT' | 'UNLISTED' | 'PUBLIC'
      authorId: string | null
    } | null = null
    if (seedId) {
      seed = await prisma.scenario.findUnique({
        where: { id: seedId },
        select: { id: true, title: true, visibility: true, authorId: true },
      })
      if (!seed || !canViewScenario(seed, userId)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name: nameResult.name,
        description: descResult.description,
        public: isPublic,
        ...(seed && {
          items: { create: { scenarioId: seed.id, scenarioTitle: seed.title } },
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        public: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      public: playlist.public,
      updatedAt: playlist.updatedAt,
      itemCount: playlist._count.items,
      contains: seed !== null,
    }, { status: 201 })
  } catch (err) {
    console.error('Failed to create playlist:', err)
    return NextResponse.json({ error: 'Could not create the playlist' }, { status: 500 })
  }
}
