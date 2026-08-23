import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCommentBody, toPublicScenarioComment } from '@/lib/scenarioComment'

const COMMENT_SELECT = {
  id: true, body: true, status: true, createdAt: true, updatedAt: true,
  user: { select: { id: true, name: true } },
} as const

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const { id } = await params
    const existing = await prisma.scenarioComment.findUnique({ where: { id }, select: { userId: true, status: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (existing.status !== 'ACTIVE') return NextResponse.json({ error: 'Comment cannot be edited' }, { status: 409 })
    const parsed = normalizeCommentBody((await req.json())?.body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const comment = await prisma.scenarioComment.update({
      where: { id }, data: { body: parsed.value }, select: COMMENT_SELECT,
    })
    return NextResponse.json({ comment: toPublicScenarioComment(comment) })
  } catch (err) {
    console.error('Failed to edit scenario comment:', err)
    return NextResponse.json({ error: 'Could not edit comment' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const { id } = await params
    const existing = await prisma.scenarioComment.findUnique({ where: { id }, select: { userId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.scenarioComment.update({ where: { id }, data: { status: 'DELETED', body: '' } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('Failed to delete scenario comment:', err)
    return NextResponse.json({ error: 'Could not delete comment' }, { status: 500 })
  }
}
