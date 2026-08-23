import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toPublicNotification } from '@/lib/subscription'

const NOTIFICATION_SELECT = {
  id: true, type: true, scenarioId: true, scenarioTitle: true, readAt: true, createdAt: true,
  actor: { select: { id: true, name: true } },
} as const

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, select: NOTIFICATION_SELECT, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return NextResponse.json({ notifications: notifications.map(toPublicNotification), unread })
  } catch (err) {
    console.error('Failed to load notifications:', err)
    return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 })
  }
}

export async function PATCH() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
  return NextResponse.json({ unread: 0 })
}
