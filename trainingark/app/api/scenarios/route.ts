import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const MAX_PAYLOAD_BYTES = 8_000_000
const MAX_COMMANDERS = 8

function sanitizeCommanders(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .slice(0, MAX_COMMANDERS)
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data, commanders } = body

    if (!title || !data) {
      return NextResponse.json({ error: 'Missing title or data' }, { status: 400 })
    }

    const scenario = await prisma.scenario.create({
      data: {
        title,
        description: description ?? '',
        difficulty: difficulty ?? 'beginner',
        commanders: sanitizeCommanders(commanders),
        data,
        authorId: userId,
      },
    })

    return NextResponse.json({ id: scenario.id, authorId: scenario.authorId }, { status: 201 })
  } catch (err) {
    console.error('Failed to create scenario:', err)
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    // `?mine=1` is what the builder's Load modal uses: the plain list has to
    // include other authors' published scenarios for the home feed, which is
    // not what you want to load into your own builder.
    const mineOnly = new URL(req.url).searchParams.get('mine') === '1'
    if (mineOnly && !userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // Everyone sees published scenarios; you additionally see your own drafts.
    // Another author's drafts are never returned.
    const where = mineOnly
      ? { authorId: userId }
      : userId
        ? { OR: [{ published: true }, { authorId: userId }] }
        : { published: true }

    const scenarios = await prisma.scenario.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        commanders: true,
        createdAt: true,
        updatedAt: true,
        published: true,
        authorId: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(scenarios)
  } catch (err) {
    console.error('Failed to list scenarios:', err)
    return NextResponse.json({ error: 'Failed to list scenarios' }, { status: 500 })
  }
}
