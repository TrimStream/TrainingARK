'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced'

const FILTERS: { key: DifficultyFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
]

export default function HomePage() {
  const [scenarios, setScenarios] = useState<ScenarioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<DifficultyFilter>('all')

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

  const filtered = filter === 'all'
    ? scenarios
    : scenarios.filter(s => s.difficulty === filter)

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <span className={styles.brand}>Training<span className={styles.brandAccent}>ARK</span></span>
        <Link href="/builder" className={styles.createBtn}>
          + Create scenario
        </Link>
      </header>

      <div className={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.stateText}>Loading scenarios...</p>
      ) : error ? (
        <p className={styles.stateTextError}>Could not load scenarios.</p>
      ) : filtered.length === 0 ? (
        <p className={styles.stateText}>
          {scenarios.length === 0
            ? 'No scenarios yet. Be the first Arkitekt — create one.'
            : 'No scenarios at this difficulty yet.'}
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map(s => (
            <Link key={s.id} href={`/scenario/${s.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>{s.title}</span>
                <span className={`${styles.difficultyBadge} ${styles[`badge_${s.difficulty}`]}`}>
                  {s.difficulty}
                </span>
              </div>
              {s.description && (
                <p className={styles.cardDesc}>{s.description}</p>
              )}
              {s.commanders.length > 0 && (
                <div className={styles.cardCommanders}>
                  {s.commanders.map((name, i) => (
                    <span key={i} className={styles.commanderChip}>{name}</span>
                  ))}
                </div>
              )}
              <div className={styles.cardFooter}>
                {!s.published && <span className={styles.draftBadge}>Draft</span>}
                <span className={styles.cardDate}>
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}