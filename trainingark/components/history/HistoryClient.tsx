'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import styles from './HistoryClient.module.css'

interface AttemptRow {
  id: string
  title: string
  /** Null when the scenario is gone, or is someone else's unpublished draft. */
  scenarioId: string | null
  available: boolean
  score: number
  maxScore: number
  completedAt: string
}

export function HistoryClient({ initialHistoryEnabled }: { initialHistoryEnabled: boolean }) {
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Per-row, so deleting one entry doesn't disable every other row's button.
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const [historyEnabled, setHistoryEnabled] = useState(initialHistoryEnabled)
  const [togglingHistory, setTogglingHistory] = useState(false)

  useEffect(() => {
    fetch('/api/attempts')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setAttempts)
      .catch(err => {
        console.error('Failed to load your history:', err)
        setError('Could not load your history. Try refreshing.')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(attempt: AttemptRow) {
    if (deletingId || clearing) return
    setDeletingId(attempt.id)
    setError(null)
    try {
      const res = await fetch(`/api/attempts/${attempt.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAttempts(list => list.filter(a => a.id !== attempt.id))
    } catch (err) {
      console.error('Delete failed:', err)
      setError('Could not remove that entry.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleClearAll() {
    if (clearing || attempts.length === 0) return
    // Same confirmation shape as the dashboard's scenario delete.
    const confirmed = window.confirm(
      `Clear all ${attempts.length} ${attempts.length === 1 ? 'entry' : 'entries'} from your history? This cannot be undone.`
    )
    if (!confirmed) return

    setClearing(true)
    setError(null)
    try {
      const res = await fetch('/api/attempts', { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setAttempts([])
    } catch (err) {
      console.error('Clear history failed:', err)
      setError('Could not clear your history.')
    } finally {
      setClearing(false)
    }
  }

  async function handleToggleHistory() {
    if (togglingHistory) return
    const next = !historyEnabled
    setTogglingHistory(true)
    setError(null)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyEnabled: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setHistoryEnabled(body.historyEnabled)
    } catch (err) {
      console.error('Could not change history setting:', err)
      setError('Could not change your history setting.')
    } finally {
      setTogglingHistory(false)
    }
  }

  const isEmpty = !loading && attempts.length === 0
  const paused = !historyEnabled

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            History{' '}
            {!loading && attempts.length > 0 && (
              <span className={styles.count}>({attempts.length})</span>
            )}
          </h1>
          {attempts.length > 0 && (
            <button
              className={styles.clearBtn}
              onClick={() => { void handleClearAll() }}
              disabled={clearing}
            >
              {clearing ? 'Clearing...' : 'Clear all history'}
            </button>
          )}
        </div>

        <div className={styles.pauseRow}>
          <div className={styles.pauseCopy}>
            <span className={styles.pauseLabel}>
              {paused ? 'History is paused' : 'Pause history'}
            </span>
            <span className={styles.pauseHint}>
              {paused
                ? 'Scenarios you complete are not being recorded. Entries already here are kept.'
                : 'Stop recording the scenarios you complete. Entries already here are kept either way.'}
            </span>
          </div>
          <button
            className={`${styles.switch} ${paused ? styles.switchOn : ''}`}
            onClick={() => { void handleToggleHistory() }}
            disabled={togglingHistory}
            role="switch"
            aria-checked={paused}
            aria-label="Pause history"
            title={paused ? 'Resume recording' : 'Pause recording'}
          >
            <span className={styles.switchKnob} />
          </button>
        </div>

        {error && <p className={styles.stateTextError}>{error}</p>}

        {loading ? (
          <div className={styles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : isEmpty ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No history yet</h2>
            <p className={styles.emptyText}>
              Finish a scenario and it will show up here with your score.
            </p>
            <Link href="/" className={styles.emptyBtn}>Browse scenarios</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {attempts.map(a => (
              <div key={a.id} className={styles.row}>
                <div className={styles.rowBody}>
                  {a.scenarioId ? (
                    <Link href={`/scenario/${a.scenarioId}`} className={styles.rowTitle}>
                      {a.title}
                    </Link>
                  ) : (
                    <span className={`${styles.rowTitle} ${styles.rowTitleGone}`}>{a.title}</span>
                  )}
                  {!a.available && (
                    <span className={styles.rowUnavailable}>Scenario no longer available</span>
                  )}
                  {/* Full date and time: repeat attempts at one scenario have to
                      read as distinct entries, not one deduplicated row. */}
                  <span className={styles.rowDate}>
                    {new Date(a.completedAt).toLocaleString()}
                  </span>
                </div>

                <span className={styles.rowScore}>{a.score}/{a.maxScore}</span>

                <button
                  className={styles.rowDelete}
                  onClick={() => { void handleDelete(a) }}
                  disabled={deletingId === a.id || clearing}
                  title="Remove from history"
                  aria-label={`Remove ${a.title} from history`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
