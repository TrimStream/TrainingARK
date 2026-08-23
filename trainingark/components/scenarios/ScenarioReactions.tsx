'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import {
  optimisticReactionSummary,
  type ScenarioReactionSummary,
  type ScenarioReactionValue,
} from '@/lib/scenarioReaction'
import styles from './ScenarioReactions.module.css'

export function ScenarioReactions({ scenarioId }: { scenarioId: string }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [summary, setSummary] = useState<ScenarioReactionSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/reaction`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((value: ScenarioReactionSummary) => {
        if (!cancelled) setSummary(value)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Could not load scenario reactions:', err)
        setError(true)
      })
    return () => { cancelled = true }
  }, [scenarioId])

  async function react(next: ScenarioReactionValue) {
    if (busy || !summary || authLoading) return
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/scenario/${scenarioId}`)}`)
      return
    }

    const previous = summary
    const target = summary.reaction === next ? null : next
    setSummary(optimisticReactionSummary(summary, target))
    setBusy(true)
    setError(false)
    try {
      const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/reaction`, target
        ? {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: target }),
          }
        : { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSummary(await res.json())
    } catch (err) {
      console.error('Could not update scenario reaction:', err)
      setSummary(previous)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (!summary) {
    return <span className={styles.loading}>{error ? 'Reactions unavailable' : 'Loading reactions...'}</span>
  }

  return (
    <div className={styles.reactions} aria-label="Scenario reactions">
      <button
        className={`${styles.button} ${summary.reaction === 'LIKE' ? styles.active : ''}`}
        onClick={() => { void react('LIKE') }}
        disabled={busy || authLoading}
        aria-pressed={summary.reaction === 'LIKE'}
        title={user ? 'Like this scenario' : 'Sign in to like this scenario'}
      >
        <span aria-hidden>👍</span> {summary.likes}
      </button>
      <button
        className={`${styles.button} ${summary.reaction === 'DISLIKE' ? styles.activeDislike : ''}`}
        onClick={() => { void react('DISLIKE') }}
        disabled={busy || authLoading}
        aria-pressed={summary.reaction === 'DISLIKE'}
        title={user ? 'Dislike this scenario' : 'Sign in to dislike this scenario'}
      >
        <span aria-hidden>👎</span> {summary.dislikes}
      </button>
      {error && <span className={styles.error} title="Reaction update failed">!</span>}
    </div>
  )
}
