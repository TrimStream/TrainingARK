'use client'

import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  EMPTY_BOOKMARK_STATE,
  reduceBookmarkState,
} from '@/lib/bookmarkState'

/**
 * App-wide bookmark state. Mounted in components/auth/Providers.tsx, which
 * already wraps every page including the viewer.
 *
 * One fetch of the id set on sign-in, rather than one request per card, and a
 * single source of truth so un-bookmarking on the dashboard immediately
 * unfills the same card on the home feed without a reload.
 */
interface BookmarksValue {
  ready: boolean
  isBookmarked: (scenarioId: string) => boolean
  toggle: (scenarioId: string) => Promise<void>
}

const BookmarksContext = createContext<BookmarksValue | null>(null)

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const userId = status === 'authenticated' ? session?.user?.id ?? null : null
  const [state, dispatch] = useReducer(reduceBookmarkState, EMPTY_BOOKMARK_STATE)
  const busyIds = useRef(new Set<string>())

  useEffect(() => {
    dispatch({ type: 'session', ownerId: userId })
    busyIds.current.clear()
    if (!userId) return

    const controller = new AbortController()
    fetch('/api/bookmarks?ids=1', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((list: string[]) => {
        dispatch({ type: 'loaded', ownerId: userId, ids: list })
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Could not load your bookmarks:', err)
      })

    return () => controller.abort()
  }, [userId])

  const isBookmarked = useCallback(
    (scenarioId: string) => state.ids.has(scenarioId),
    [state.ids]
  )

  const toggle = useCallback(async (scenarioId: string) => {
    if (!userId || busyIds.current.has(scenarioId)) return
    busyIds.current.add(scenarioId)
    const wasBookmarked = state.ids.has(scenarioId)

    // Optimistic: the icon flips immediately and is rolled back on failure.
    dispatch({ type: 'toggle', scenarioId, bookmarked: !wasBookmarked })

    try {
      const res = wasBookmarked
        ? await fetch(`/api/bookmarks/${scenarioId}`, { method: 'DELETE' })
        : await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId }),
          })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error('Could not update that bookmark:', err)
      dispatch({ type: 'toggle', scenarioId, bookmarked: wasBookmarked })
    } finally {
      busyIds.current.delete(scenarioId)
    }
  }, [state.ids, userId])

  return (
    <BookmarksContext.Provider value={{ ready: state.ready, isBookmarked, toggle }}>
      {children}
    </BookmarksContext.Provider>
  )
}

/** Null outside the provider, which keeps the controls inert rather than crashing. */
export function useBookmarks(): BookmarksValue | null {
  return useContext(BookmarksContext)
}
