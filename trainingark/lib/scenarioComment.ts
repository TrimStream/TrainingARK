import { arkitektDisplayName } from './arkitektProfile'

export const MAX_COMMENT_LENGTH = 2000
export const MAX_REPORT_DETAILS_LENGTH = 500
export const COMMENT_REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE', 'OTHER'] as const

export type CommentReportReasonValue = (typeof COMMENT_REPORT_REASONS)[number]

export type CommentBodyResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

export function normalizeCommentBody(input: unknown): CommentBodyResult {
  if (typeof input !== 'string') return { ok: false, error: 'Comment must be text.' }
  const value = input.trim()
  if (!value) return { ok: false, error: 'Comment cannot be empty.' }
  if (value.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` }
  }
  return { ok: true, value }
}

export function parseCommentReportReason(input: unknown): CommentReportReasonValue | null {
  return typeof input === 'string' && COMMENT_REPORT_REASONS.includes(input as CommentReportReasonValue)
    ? input as CommentReportReasonValue
    : null
}

export function normalizeReportDetails(input: unknown): string | null | undefined {
  if (input === undefined || input === null || input === '') return null
  if (typeof input !== 'string') return undefined
  const value = input.trim()
  return value.length <= MAX_REPORT_DETAILS_LENGTH ? value || null : undefined
}

export interface PublicScenarioComment {
  id: string
  body: string | null
  status: 'ACTIVE' | 'DELETED' | 'REMOVED'
  createdAt: string
  updatedAt: string
  author: { id: string; name: string }
}

export function toPublicScenarioComment(comment: {
  id: string
  body: string
  status: 'ACTIVE' | 'DELETED' | 'REMOVED'
  createdAt: Date
  updatedAt: Date
  user: { id: string; name: string | null }
}): PublicScenarioComment {
  return {
    id: comment.id,
    body: comment.status === 'ACTIVE' ? comment.body : null,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: { id: comment.user.id, name: arkitektDisplayName(comment.user.name) },
  }
}
