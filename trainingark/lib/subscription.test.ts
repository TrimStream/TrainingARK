import { describe, expect, it } from 'vitest'
import { canFollowUser, isFirstPublication, toPublicNotification } from './subscription'

describe('subscriptions and notifications', () => {
  it('prevents self-follows', () => {
    expect(canFollowUser('one', 'two')).toBe(true)
    expect(canFollowUser('one', 'one')).toBe(false)
  })

  it('notifies followers only on the first transition to public', () => {
    expect(isFirstPublication(null, 'PUBLIC')).toBe(true)
    expect(isFirstPublication(null, 'UNLISTED')).toBe(false)
    expect(isFirstPublication(new Date(), 'PUBLIC')).toBe(false)
  })

  it('normalizes notifications without exposing email addresses', () => {
    expect(toPublicNotification({
      id: 'n1', type: 'SCENARIO_PUBLISHED', scenarioId: null,
      scenarioTitle: 'Mulligan decisions', readAt: null,
      createdAt: new Date('2026-08-22T00:00:00Z'),
      actor: { id: 'u1', name: null },
    })).toEqual({
      id: 'n1', type: 'SCENARIO_PUBLISHED',
      actor: { id: 'u1', name: 'Arkitekt' },
      scenario: { id: null, title: 'Mulligan decisions' },
      read: false, createdAt: '2026-08-22T00:00:00.000Z',
    })
  })
})
