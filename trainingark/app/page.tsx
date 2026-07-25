'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import styles from './page.module.css'


interface ScenarioCard {
  id: string
  title: string
  description: string
  difficulty: string
  commanders: string[]
  updatedAt: string
  published: boolean
}

const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'] as const
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function Card({ s }: { s: ScenarioCard }) {
  return (
    <Link href={`/scenario/${s.id}`} className={styles.card}>
      <div className={styles.cardThumb}>
        <span className={`${styles.difficultyBadge} ${styles[`badge_${s.difficulty}`]}`}>
          {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}
        </span>
        {!s.published && <span className={styles.draftBadge}>Draft</span>}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{s.title}</span>
        {s.description && <p className={styles.cardDesc}>{s.description}</p>}
        {s.commanders.length > 0 && (
          <div className={styles.cardCommanders}>
            {s.commanders.slice(0, 3).map((name, i) => (
              <span key={i} className={styles.commanderChip}>{name}</span>
            ))}
            {s.commanders.length > 3 && (
              <span className={styles.commanderMore}>+{s.commanders.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
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

function Row({ title, scenarios, loading }: { title: string; scenarios: ScenarioCard[]; loading: boolean }) {
  if (!loading && scenarios.length === 0) return null
  return (
    <section className={styles.row}>
      <h2 className={styles.rowTitle}>{title}</h2>
      <div className={styles.rowGrid}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : scenarios.map(s => <Card key={s.id} s={s} />)
        }
      </div>
    </section>
  )
}

export default function HomePage() {
  const [scenarios, setScenarios] = useState<ScenarioCard[]>([])
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