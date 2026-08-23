import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canFollowUser } from '@/lib/subscription'

async function summary(followerId: string | undefined, followingId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId } }),
    followerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } }) : null,
  ])
  return { followers, following: following !== null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(await summary(session?.user?.id, id))
}

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: followingId } = await params
    const session = await auth()
    const followerId = session?.user?.id
    if (!followerId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (!canFollowUser(followerId, followingId)) return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 })
    const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.$transaction(async tx => {
      const existing = await tx.follow.findUnique({ where: { followerId_followingId: { followerId, followingId } } })
      if (existing) return
      await tx.follow.create({ data: { followerId, followingId } })
      await tx.notification.create({ data: { userId: followingId, actorId: followerId, type: 'NEW_FOLLOWER' } })
    })
    return NextResponse.json(await summary(followerId, followingId))
  } catch (err) {
    console.error('Failed to follow Arkitekt:', err)
    return NextResponse.json({ error: 'Could not follow Arkitekt' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: followingId } = await params
  const session = await auth()
  const followerId = session?.user?.id
  if (!followerId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  await prisma.follow.deleteMany({ where: { followerId, followingId } })
  return NextResponse.json(await summary(followerId, followingId))
}
