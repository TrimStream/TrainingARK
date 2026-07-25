'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import styles from './DashboardClient.module.css'

interface DashboardScenario {
  id: string
  title: string
  description: string
  difficulty: string
  commanders: string[]
  updatedAt: string
  published: boolean
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
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

export function DashboardClient() {
  const [scenarios, setScenarios] = useState<DashboardScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-row, so deleting one card doesn't disable every other card's button.
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Your scenarios{' '}
            {!loading && scenarios.length > 0 && (
              <span className={styles.count}>({scenarios.length})</span>
            )}
          </h1>
          {!isEmpty && <Link href="/builder" className={styles.newBtn}>New scenario</Link>}
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
        ) : (
          <div className={styles.grid}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : scenarios.map(s => (
                <div key={s.id} className={styles.card}>
                  <div className={styles.cardThumb}>
                    <span className={`${styles.difficultyBadge} ${styles[`badge_${s.difficulty}`]}`}>
                      {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}
                    </span>
                    <span className={`${styles.statusBadge} ${s.published ? styles.statusPublished : styles.statusDraft}`}>
                      {s.published ? 'Published' : 'Draft'}
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
      </div>
    </AppShell>
  )
}
