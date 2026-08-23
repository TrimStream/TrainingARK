export interface BookmarkState {
  ownerId: string | null
  ids: Set<string>
  ready: boolean
}

export type BookmarkAction =
  | { type: 'session'; ownerId: string | null }
  | { type: 'loaded'; ownerId: string; ids: Iterable<string> }
  | { type: 'toggle'; scenarioId: string; bookmarked: boolean }

export const EMPTY_BOOKMARK_STATE: BookmarkState = {
  ownerId: null,
  ids: new Set(),
  ready: false,
}

/** Keeps bookmark data scoped to the session that fetched it. */
export function reduceBookmarkState(
  state: BookmarkState,
  action: BookmarkAction
): BookmarkState {
  if (action.type === 'session') {
    if (action.ownerId === state.ownerId) return state
    return { ownerId: action.ownerId, ids: new Set(), ready: action.ownerId === null }
  }

  if (action.type === 'loaded') {
    if (action.ownerId !== state.ownerId) return state
    return { ...state, ids: new Set(action.ids), ready: true }
  }

  const ids = new Set(state.ids)
  if (action.bookmarked) ids.add(action.scenarioId)
  else ids.delete(action.scenarioId)
  return { ...state, ids }
}
