'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { ScenarioCard, ScenarioCardSkeleton, type ScenarioCardData } from '@/components/scenarios/ScenarioCard'
import styles from './SubscriptionsClient.module.css'

export function SubscriptionsClient() {
  const [scenarios, setScenarios] = useState<ScenarioCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/feed')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(setScenarios)
      .catch(err => { console.error('Could not load subscriptions:', err); setError(true) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <main className={styles.page}>
        <header><h1>Subscriptions</h1><p>New and recently updated scenarios from Arkitekts you follow.</p></header>
        {error ? <p className={styles.error}>Could not load your subscriptions.</p> : (
          <div className={styles.grid}>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <ScenarioCardSkeleton key={index} />)
              : scenarios.map(scenario => <ScenarioCard key={scenario.id} s={scenario} />)}
          </div>
        )}
        {!loading && !error && scenarios.length === 0 && (
          <div className={styles.empty}>
            <h2>Your feed is quiet</h2>
            <p>Follow an Arkitekt from their profile to see their public scenarios here.</p>
            <Link href="/">Explore scenarios</Link>
          </div>
        )}
      </main>
    </AppShell>
  )
}
