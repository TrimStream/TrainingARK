import { arkitektDisplayName } from './arkitektProfile'

export function canFollowUser(followerId: string, followingId: string): boolean {
  return Boolean(followerId && followingId && followerId !== followingId)
}

export function isFirstPublication(
  publishedAt: Date | null,
  nextVisibility: 'DRAFT' | 'UNLISTED' | 'PUBLIC'
): boolean {
  return publishedAt === null && nextVisibility === 'PUBLIC'
}

export interface PublicNotification {
  id: string
  type: 'NEW_FOLLOWER' | 'SCENARIO_PUBLISHED'
  actor: { id: string; name: string }
  scenario: { id: string | null; title: string } | null
  read: boolean
  createdAt: string
}

export function toPublicNotification(notification: {
  id: string
  type: 'NEW_FOLLOWER' | 'SCENARIO_PUBLISHED'
  scenarioId: string | null
  scenarioTitle: string | null
  readAt: Date | null
  createdAt: Date
  actor: { id: string; name: string | null }
}): PublicNotification {
  return {
    id: notification.id,
    type: notification.type,
    actor: { id: notification.actor.id, name: arkitektDisplayName(notification.actor.name) },
    scenario: notification.type === 'SCENARIO_PUBLISHED'
      ? { id: notification.scenarioId, title: notification.scenarioTitle || 'a scenario' }
      : null,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  }
}
