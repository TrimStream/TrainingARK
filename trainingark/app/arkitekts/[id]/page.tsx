import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { arkitektDisplayName } from '@/lib/arkitektProfile'
import {
  PUBLIC_SCENARIO_WHERE,
  SCENARIO_CARD_SELECT,
  withScenarioAuthor,
} from '@/lib/scenarioVisibility'
import { AppShell } from '@/components/shell/AppShell'
import { ScenarioCard } from '@/components/scenarios/ScenarioCard'
import styles from './page.module.css'

async function getArkitekt(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      createdAt: true,
      scenarios: {
        where: PUBLIC_SCENARIO_WHERE,
        select: SCENARIO_CARD_SELECT,
        orderBy: { updatedAt: 'desc' },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const arkitekt = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  })
  return { title: arkitekt ? arkitektDisplayName(arkitekt.name) : 'Arkitekt' }
}

export default async function ArkitektPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const arkitekt = await getArkitekt(id)
  if (!arkitekt) notFound()

  const name = arkitektDisplayName(arkitekt.name)
  const scenarios = arkitekt.scenarios.map(scenario => ({
    ...withScenarioAuthor(scenario),
    updatedAt: scenario.updatedAt.toISOString(),
  }))

  return (
    <AppShell>
      <main className={styles.page}>
        <header className={styles.profileHeader}>
          <div className={styles.avatar} aria-hidden>{name.charAt(0).toUpperCase()}</div>
          <div className={styles.identity}>
            <h1 className={styles.name}>{name}</h1>
            <p className={styles.meta}>
              Arkitekt since {arkitekt.createdAt.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              {scenarios.length} public {scenarios.length === 1 ? 'scenario' : 'scenarios'}
            </p>
            {arkitekt.bio && <p className={styles.bio}>{arkitekt.bio}</p>}
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>Scenarios</h2>
          {scenarios.length > 0 ? (
            <div className={styles.grid}>
              {scenarios.map(scenario => <ScenarioCard key={scenario.id} s={scenario} />)}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3>No public scenarios yet</h3>
              <p>This Arkitekt has not published a scenario.</p>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  )
}
