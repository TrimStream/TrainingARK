'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './DashboardClient.module.css'

// Moved verbatim out of DashboardClient when the dashboard gained tabs. The
// behaviour — fetch, live filter, per-row delete — is unchanged.

interface DashboardScenario {
  id: string
  title: string
  description: string
  difficulty: string
  commanders: string[]
  updatedAt: string
  visibility: 'DRAFT' | 'UNLISTED' | 'PUBLIC'
  author?: { id: string; name: string } | null
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/**
 * Filters the already-loaded list in memory. This is deliberately NOT the top
 * bar's search: it never calls the search API, so it can only ever match
 * scenarios from this user's own `?mine=1` fetch — drafts included, and other
 * authors' scenarios excluded no matter what is typed.
 */
function matchesFilter(scenario: DashboardScenario, needle: string): boolean {
  const haystack = [
    scenario.title,
    scenario.author?.name ?? '',
    ...scenario.commanders,
  ]
  return haystack.some(value => value.toLowerCase().includes(needle))
}

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.cardThumb} ${styles.skeleton}`} />
      <div className={styles.cardBody}>
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: '70%' }} />
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: '90%' }} />
        <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: '50%' }} />
      </div>
    </div>
  )
}

export function ScenariosTab() {
  const [scenarios, setScenarios] = useState<DashboardScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-row, so deleting one card doesn't disable every other card's button.
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    // `mine=1` returns this user's scenarios only — drafts included, which the
    // unfiltered feed deliberately hides.
    fetch('/api/scenarios?mine=1')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setScenarios)
      .catch(err => {
        console.error('Failed to load your scenarios:', err)
        setError('Could not load your scenarios. Try refreshing.')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(scenario: DashboardScenario) {
    if (deletingId) return
    // Same confirmation wording as the builder header's own delete button.
    const confirmed = window.confirm(
      `Delete "${scenario.title}" permanently? This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(scenario.id)
    setError(null)
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setScenarios(list => list.filter(s => s.id !== scenario.id))
    } catch (err) {
      console.error('Delete failed:', err)
      setError(`Could not delete "${scenario.title}".`)
    } finally {
      setDeletingId(null)
    }
  }

  const isEmpty = !loading && scenarios.length === 0

  // Live filter, no debounce and no request — the list is already in state.
  const needle = filter.trim().toLowerCase()
  const visible = needle ? scenarios.filter(s => matchesFilter(s, needle)) : scenarios
  const filteredToNothing = !loading && scenarios.length > 0 && visible.length === 0

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionCount}>
          {!loading && scenarios.length > 0 && (
            needle ? `${visible.length} of ${scenarios.length}` : `${scenarios.length} scenarios`
          )}
        </span>
        {!isEmpty && (
          <div className={styles.headerActions}>
            <input
              className={styles.filterInput}
              type="text"
              placeholder="Filter your scenarios..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              aria-label="Filter your scenarios"
              autoComplete="off"
            />
            <Link href="/builder" className={styles.newBtn}>New scenario</Link>
          </div>
        )}
      </div>

      {error && <p className={styles.stateTextError}>{error}</p>}

      {isEmpty ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No scenarios yet</h2>
          <p className={styles.emptyText}>
            Build your first cEDH position and it will show up here as a draft.
          </p>
          <Link href="/builder" className={styles.emptyBtn}>Create scenario</Link>
        </div>
      ) : filteredToNothing ? (
        <p className={styles.noMatches}>
          No scenarios match &ldquo;{filter.trim()}&rdquo;.
        </p>
      ) : (
        <div className={styles.grid}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : visible.map(s => (
              <div key={s.id} className={styles.card}>
                <div className={styles.cardThumb}>
                  <span className={`${styles.difficultyBadge} ${styles[`badge_${s.difficulty}`]}`}>
                    {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}
                  </span>
                  <span className={`${styles.statusBadge} ${s.visibility === 'PUBLIC' ? styles.statusPublished : styles.statusDraft}`}>
                    {s.visibility === 'PUBLIC' ? 'Public' : s.visibility === 'UNLISTED' ? 'Unlisted' : 'Draft'}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <span className={styles.cardTitle}>{s.title}</span>
                  {s.description && <p className={styles.cardDesc}>{s.description}</p>}
                  <span className={styles.cardMeta}>
                    Updated {new Date(s.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <Link href={`/builder?id=${s.id}`} className={styles.editBtn}>Edit</Link>
                  <Link href={`/scenario/${s.id}`} className={styles.viewBtn}>View</Link>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => { void handleDelete(s) }}
                    disabled={deletingId === s.id}
                    title="Delete this scenario permanently"
                  >
                    {deletingId === s.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </>
  )
}
