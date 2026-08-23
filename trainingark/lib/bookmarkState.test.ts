import { describe, expect, it } from 'vitest'
import { EMPTY_BOOKMARK_STATE, reduceBookmarkState } from './bookmarkState'

describe('bookmark session state', () => {
  it('clears bookmark data when the signed-in account changes', () => {
    let state = reduceBookmarkState(EMPTY_BOOKMARK_STATE, { type: 'session', ownerId: 'user-a' })
    state = reduceBookmarkState(state, { type: 'loaded', ownerId: 'user-a', ids: ['scenario-1'] })

    state = reduceBookmarkState(state, { type: 'session', ownerId: 'user-b' })

    expect([...state.ids]).toEqual([])
    expect(state.ready).toBe(false)
    expect(state.ownerId).toBe('user-b')
  })

  it('ignores a stale response from the previous account', () => {
    let state = reduceBookmarkState(EMPTY_BOOKMARK_STATE, { type: 'session', ownerId: 'user-a' })
    state = reduceBookmarkState(state, { type: 'session', ownerId: 'user-b' })

    const next = reduceBookmarkState(state, {
      type: 'loaded',
      ownerId: 'user-a',
      ids: ['private-to-user-a'],
    })

    expect(next).toBe(state)
    expect([...next.ids]).toEqual([])
  })

  it('clears bookmark data and becomes ready on sign-out', () => {
    let state = reduceBookmarkState(EMPTY_BOOKMARK_STATE, { type: 'session', ownerId: 'user-a' })
    state = reduceBookmarkState(state, { type: 'loaded', ownerId: 'user-a', ids: ['scenario-1'] })

    state = reduceBookmarkState(state, { type: 'session', ownerId: null })

    expect(state).toEqual({ ownerId: null, ids: new Set(), ready: true })
  })

  it('applies optimistic changes without mutating prior state', () => {
    const state = { ownerId: 'user-a', ids: new Set(['scenario-1']), ready: true }
    const next = reduceBookmarkState(state, {
      type: 'toggle',
      scenarioId: 'scenario-2',
      bookmarked: true,
    })

    expect([...state.ids]).toEqual(['scenario-1'])
    expect([...next.ids]).toEqual(['scenario-1', 'scenario-2'])
  })
})
