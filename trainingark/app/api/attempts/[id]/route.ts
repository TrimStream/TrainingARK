import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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

    // Same ownership shape as the scenario delete route: 404 when it does not
    // exist, 403 when it is not yours.
    const existing = await prisma.attempt.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Not your attempt' }, { status: 403 })
    }

    await prisma.attempt.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete attempt:', err)
    return NextResponse.json({ error: 'Could not delete this entry' }, { status: 500 })
  }
}
