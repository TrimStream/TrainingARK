import { describe, expect, it } from 'vitest'
import {
  MAX_COMMENT_LENGTH,
  normalizeCommentBody,
  normalizeReportDetails,
  parseCommentReportReason,
  toPublicScenarioComment,
} from './scenarioComment'

describe('scenario comments', () => {
  it('trims valid comments and rejects empty or oversized comments', () => {
    expect(normalizeCommentBody('  Useful line  ')).toEqual({ ok: true, value: 'Useful line' })
    expect(normalizeCommentBody('  ')).toEqual({ ok: false, error: 'Comment cannot be empty.' })
    expect(normalizeCommentBody('x'.repeat(MAX_COMMENT_LENGTH + 1)).ok).toBe(false)
    expect(normalizeCommentBody(null).ok).toBe(false)
  })

  it('accepts only supported report reasons and bounded optional details', () => {
    expect(parseCommentReportReason('HARASSMENT')).toBe('HARASSMENT')
    expect(parseCommentReportReason('CRITICISM')).toBeNull()
    expect(normalizeReportDetails('  context  ')).toBe('context')
    expect(normalizeReportDetails(null)).toBeNull()
    expect(normalizeReportDetails('x'.repeat(501))).toBeUndefined()
  })

  it('does not expose deleted content or an author email fallback', () => {
    const result = toPublicScenarioComment({
      id: 'comment-1',
      body: 'original text',
      status: 'DELETED',
      createdAt: new Date('2026-08-22T00:00:00Z'),
      updatedAt: new Date('2026-08-22T01:00:00Z'),
      user: { id: 'user-1', name: null },
    })
    expect(result.body).toBeNull()
    expect(result.author).toEqual({ id: 'user-1', name: 'Arkitekt' })
  })
})
