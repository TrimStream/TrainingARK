import { describe, expect, it } from 'vitest'
import {
  builderDraftStorageKey,
  isMeaningfulBuilderDraft,
  parseBuilderDraft,
  pendingDraftExitRequest,
  serializeBuilderDraft,
} from './builderDraft'

describe('builder draft persistence', () => {
  it('does not create a draft just because the blank builder was opened', () => {
    expect(isMeaningfulBuilderDraft({
      title: 'Untitled Scenario',
      description: '',
      setupComplete: [false, false, false, false],
      stepCount: 0,
      scenarioStarted: false,
    })).toBe(false)
  })

  it.each([
    { title: 'A real title' },
    { description: 'What this scenario teaches' },
    { setupComplete: [true, false, false, false] },
    { stepCount: 1 },
    { scenarioStarted: true },
  ])('recognizes meaningful work before a full board setup: %o', change => {
    expect(isMeaningfulBuilderDraft({
      title: 'Untitled Scenario',
      description: '',
      setupComplete: [false, false, false, false],
      stepCount: 0,
      scenarioStarted: false,
      ...change,
    })).toBe(true)
  })

  it('round-trips a recovery copy only for the account that created it', () => {
    const body = JSON.stringify({ title: 'Recovered draft', data: { steps: [] } })
    const raw = serializeBuilderDraft('user-a', body, 123)

    expect(parseBuilderDraft(raw, 'user-a')).toEqual({
      version: 1,
      userId: 'user-a',
      body,
      updatedAt: 123,
    })
    expect(parseBuilderDraft(raw, 'user-b')).toBeNull()
    expect(builderDraftStorageKey('user-a')).toContain('user-a')
  })

  it('rejects corrupt recovery data', () => {
    expect(parseBuilderDraft('{broken', 'user-a')).toBeNull()
    expect(parseBuilderDraft(JSON.stringify({
      version: 1,
      userId: 'user-a',
      body: '{broken',
      updatedAt: 123,
    }), 'user-a')).toBeNull()
  })

  it('creates a keepalive update only for dirty, server-backed drafts', () => {
    const request = pendingDraftExitRequest('draft/id', '{"new":true}', '{"old":true}')
    expect(request).toEqual({
      url: '/api/scenarios/draft%2Fid',
      init: {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{"new":true}',
        keepalive: true,
      },
    })
    expect(pendingDraftExitRequest(null, '{}', null)).toBeNull()
    expect(pendingDraftExitRequest('draft', '{}', '{}')).toBeNull()
  })
})
