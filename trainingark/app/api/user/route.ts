import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Display name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.` },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { name: true },
    })

    return NextResponse.json({ name: user.name })
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
