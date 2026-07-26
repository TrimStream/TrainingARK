'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ScenarioCard,
  ScenarioCardSkeleton,
  UnavailableCard,
  type ScenarioCardData,
} from '@/components/scenarios/ScenarioCard'
import { useBookmarks } from '@/components/scenarios/BookmarksProvider'
import styles from './DashboardClient.module.css'

interface BookmarkRow {
  id: string
  scenarioId: string | null
  available: boolean
  title: string
  scenario: ScenarioCardData | null
}

export function BookmarksTab() {
  const bookmarks = useBookmarks()
  const [rows, setRows] = useState<BookmarkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bookmarks')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setRows)
      .catch(err => {
        console.error('Failed to load your bookmarks:', err)
        setError('Could not load your bookmarks. Try refreshing.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Orphans have no scenario id left, so the shared provider can't track them.
  // They are removed by their own bookmark id, which the delete route accepts.
  async function handleRemoveOrphan(row: BookmarkRow) {
    if (removingId) return
    setRemovingId(row.id)
    setError(null)
    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRows(list => list.filter(r => r.id !== row.id))
    } catch (err) {
      console.error('Could not remove that bookmark:', err)
      setError('Could not remove that bookmark.')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => <ScenarioCardSkeleton key={i} />)}
      </div>
    )
  }

  // A live row disappears the moment its star is unfilled anywhere in the app,
  // because visibility is derived from the shared provider rather than from
  // this component's own copy of the list.
  const visible = rows.filter(r =>
    r.scenarioId === null || !bookmarks || bookmarks.isBookmarked(r.scenarioId)
  )

  if (visible.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>No bookmarks yet</h2>
        <p className={styles.emptyText}>
          Use the ☆ on any scenario to save it here for later.
        </p>
        <Link href="/" className={styles.emptyBtn}>Browse scenarios</Link>
      </div>
    )
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionCount}>
          {visible.length} {visible.length === 1 ? 'bookmark' : 'bookmarks'}
        </span>
      </div>

      {error && <p className={styles.stateTextError}>{error}</p>}

      <div className={styles.grid}>
        {visible.map(row => {
          // The scenario is gone: keep the saved entry, show the snapshot
          // title, and offer an explicit remove since there is no star.
          if (!row.scenario) {
            return (
              <UnavailableCard
                key={row.id}
                title={row.title}
                action={
                  <button
                    className={styles.unsaveBtn}
                    onClick={() => { void handleRemoveOrphan(row) }}
                    disabled={removingId === row.id}
                    title="Remove bookmark"
                    aria-label={`Remove ${row.title} from bookmarks`}
                  >
                    ×
                  </button>
                }
              />
            )
          }

          // Live entry: the card's own star is the unbookmark control.
          return <ScenarioCard key={row.id} s={row.scenario} />
        })}
      </div>
    </>
  )
}
