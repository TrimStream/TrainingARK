const LOCAL_DRAFT_VERSION = 1
const DEFAULT_SCENARIO_TITLE = 'Untitled Scenario'

export interface BuilderDraftSignals {
  title: string
  description: string
  setupComplete: boolean[]
  stepCount: number
  scenarioStarted: boolean
}

interface StoredBuilderDraft {
  version: typeof LOCAL_DRAFT_VERSION
  userId: string
  body: string
  updatedAt: number
}

export function isMeaningfulBuilderDraft(signals: BuilderDraftSignals): boolean {
  return signals.title.trim() !== DEFAULT_SCENARIO_TITLE
    || signals.description.trim().length > 0
    || signals.setupComplete.some(Boolean)
    || signals.stepCount > 0
    || signals.scenarioStarted
}

export function builderDraftStorageKey(userId: string): string {
  return `trainingark:builder-draft:${userId}`
}

export function serializeBuilderDraft(
  userId: string,
  body: string,
  updatedAt = Date.now()
): string {
  JSON.parse(body)
  return JSON.stringify({
    version: LOCAL_DRAFT_VERSION,
    userId,
    body,
    updatedAt,
  } satisfies StoredBuilderDraft)
}

export function parseBuilderDraft(raw: string, userId: string): StoredBuilderDraft | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const draft = value as Partial<StoredBuilderDraft>
    if (
      draft.version !== LOCAL_DRAFT_VERSION
      || draft.userId !== userId
      || typeof draft.body !== 'string'
      || typeof draft.updatedAt !== 'number'
    ) return null
    JSON.parse(draft.body)
    return draft as StoredBuilderDraft
  } catch {
    return null
  }
}

export function pendingDraftExitRequest(
  scenarioId: string | null,
  body: string,
  lastSavedBody: string | null
): { url: string; init: RequestInit } | null {
  if (!scenarioId || body === lastSavedBody) return null
  return {
    url: `/api/scenarios/${encodeURIComponent(scenarioId)}`,
    init: {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    },
  }
}
