'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ScenarioCard, ScenarioCardSkeleton, type ScenarioCardData } from '@/components/scenarios/ScenarioCard'
import styles from './SearchResults.module.css'

// The results page wants everything that matched, not the top few the top
// bar's dropdown asks for. 100 is the API's own ceiling.
const RESULTS_LIMIT = 100

// What came back, tagged with the query it came back for. Keeping the two
// together means "still loading" is derived rather than a separate flag, so a
// new query never briefly renders the previous one's results.
interface Outcome {
  query: string
  results: ScenarioCardData[]
  error: boolean
}

export function SearchResults({ query }: { query: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    if (!query) return

    // Guards against an out-of-order response overwriting a newer search when
    // the query changes while a request is still in flight.
    let cancelled = false

    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${RESULTS_LIMIT}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: ScenarioCardData[]) => {
        if (!cancelled) setOutcome({ query, results: data, error: false })
      })
      .catch(err => {
        if (cancelled) return
        console.error('Search failed:', err)
        setOutcome({ query, results: [], error: true })
      })

    return () => { cancelled = true }
  }, [query])

  const settled = outcome?.query === query ? outcome : null
  const loading = !settled
  const error = settled?.error ?? false
  const results = settled?.results ?? []

  // Someone navigated to /search directly, with no query to run.
  if (!query) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.header}>
            <h1 className={styles.title}>Search</h1>
          </div>
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>What are you looking for?</h2>
            <p className={styles.emptyText}>
              Search public scenarios by title, commander, or the Arkitekt who built them
              using the bar at the top of the page.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Results for <span className={styles.queryText}>&ldquo;{query}&rdquo;</span>
          </h1>
          {!loading && !error && results.length > 0 && (
            <p className={styles.count}>
              {results.length} scenario{results.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {error ? (
          <p className={styles.stateTextError}>Search failed. Try again.</p>
        ) : loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => <ScenarioCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No scenarios found for &ldquo;{query}&rdquo;</h2>
            <p className={styles.emptyText}>
              Try a different title, commander, or Arkitekt name. Only public scenarios
              are searchable.
            </p>
            <Link href="/builder" className={styles.emptyBtn}>Create scenario</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {results.map(s => <ScenarioCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
