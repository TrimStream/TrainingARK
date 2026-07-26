'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ScenarioCard, ScenarioCardSkeleton, type ScenarioCardData } from '@/components/scenarios/ScenarioCard'
import styles from './page.module.css'


const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'] as const
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function Row({ title, scenarios, loading }: { title: string; scenarios: ScenarioCardData[]; loading: boolean }) {
  if (!loading && scenarios.length === 0) return null
  return (
    <section className={styles.row}>
      <h2 className={styles.rowTitle}>{title}</h2>
      <div className={styles.rowGrid}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ScenarioCardSkeleton key={i} />)
          : scenarios.map(s => <ScenarioCard key={s.id} s={s} />)
        }
      </div>
    </section>
  )
}

export default function HomePage() {
  const [scenarios, setScenarios] = useState<ScenarioCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/scenarios')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setScenarios)
      .catch(err => {
        console.error('Failed to load scenarios:', err)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const newest = [...scenarios].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 8)

  return (
    <AppShell>
      <div className={styles.feed}>
        {error ? (
          <p className={styles.stateTextError}>Could not load scenarios. Try refreshing.</p>
        ) : (
          <>
            <Row title="Newest scenarios" scenarios={newest} loading={loading} />
            {DIFFICULTY_ORDER.map(diff => (
              <Row
                key={diff}
                title={DIFFICULTY_LABELS[diff]}
                scenarios={scenarios.filter(s => s.difficulty === diff)}
                loading={loading}
              />
            ))}
            {!loading && scenarios.length === 0 && (
              <div className={styles.emptyState}>
                <h2 className={styles.emptyTitle}>No scenarios yet</h2>
                <p className={styles.emptyText}>Be the first Arkitekt — create one.</p>
                <Link href="/builder" className={styles.emptyBtn}>Create scenario</Link>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}