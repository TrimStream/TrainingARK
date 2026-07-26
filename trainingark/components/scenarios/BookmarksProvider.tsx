'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

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
  const { status } = useSession()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
    fetch('/api/bookmarks?ids=1')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((list: string[]) => {
        if (cancelled) return
        setIds(new Set(list))
        setReady(true)
      })
      .catch(err => console.error('Could not load your bookmarks:', err))

    return () => { cancelled = true }
  }, [status])

  const isBookmarked = useCallback((scenarioId: string) => ids.has(scenarioId), [ids])

  const toggle = useCallback(async (scenarioId: string) => {
    const wasBookmarked = ids.has(scenarioId)

    // Optimistic: the icon flips immediately and is rolled back on failure.
    setIds(prev => {
      const next = new Set(prev)
      if (wasBookmarked) next.delete(scenarioId)
      else next.add(scenarioId)
      return next
    })

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
      setIds(prev => {
        const next = new Set(prev)
        if (wasBookmarked) next.add(scenarioId)
        else next.delete(scenarioId)
        return next
      })
    }
  }, [ids])

  return (
    <BookmarksContext.Provider value={{ ready, isBookmarked, toggle }}>
      {children}
    </BookmarksContext.Provider>
  )
}

/** Null outside the provider, which keeps the controls inert rather than crashing. */
export function useBookmarks(): BookmarksValue | null {
  return useContext(BookmarksContext)
}
