import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeArkitektBio } from '@/lib/arkitektProfile'

const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 40

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = await req.json()

    // Each field is validated only when it is actually supplied, so the
    // settings form can send just { name } and the history page just
    // { historyEnabled } through the same route.
    const data: { name?: string; bio?: string | null; historyEnabled?: boolean } = {}

    if (body?.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Display name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.` },
          { status: 400 }
        )
      }
      data.name = name
    }

    if (body?.bio !== undefined) {
      const bio = normalizeArkitektBio(body.bio)
      if (!bio.ok) {
        return NextResponse.json({ error: bio.error }, { status: 400 })
      }
      data.bio = bio.value
    }

    if (body?.historyEnabled !== undefined) {
      if (typeof body.historyEnabled !== 'boolean') {
        return NextResponse.json({ error: 'historyEnabled must be true or false.' }, { status: 400 })
      }
      data.historyEnabled = body.historyEnabled
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { name: true, bio: true, historyEnabled: true },
    })

    return NextResponse.json({
      name: user.name,
      bio: user.bio,
      historyEnabled: user.historyEnabled,
    })
  } catch (err) {
    console.error('Failed to update user:', err)
    return NextResponse.json({ error: 'Could not update your account.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // Product decision: deleting your account deletes everything you authored,
    // published or not. Scenario.authorId is nullable, so leaving the scenarios
    // behind would orphan them (Prisma's default for an optional relation is
    // SetNull) rather than fail loudly.
    //
    // Order matches the single-scenario delete route: Events reference their
    // scenario with a required FK and no cascade, so they go first. Account and
    // Session rows do cascade from User, per the schema.
    //
    // The Event filter walks the relation instead of a pre-read list of ids, so
    // a scenario created between reading and deleting can't slip through.
    //
    // Attempt needs no entry here: its userId FK cascades, so this user's own
    // history goes with the row below. Other users' attempts at the scenarios
    // being deleted survive with scenarioId set null — deliberately, so nobody
    // else's play history is erased by this account closing.
    await prisma.$transaction([
      prisma.event.deleteMany({ where: { scenario: { authorId: userId } } }),
      prisma.scenario.deleteMany({ where: { authorId: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete user:', err)
    return NextResponse.json({ error: 'Could not delete your account.' }, { status: 500 })
  }
}
