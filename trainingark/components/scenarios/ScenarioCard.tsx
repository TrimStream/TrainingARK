import Link from 'next/link'
import styles from './ScenarioCard.module.css'

/**
 * Author as every scenario surface receives it. Mirrors ScenarioAuthor in
 * lib/scenarioVisibility.ts — the id rides along with the name so the planned
 * /author/<id> page can be linked later without touching the API or this prop.
 */
export interface ScenarioCardAuthor {
  id: string
  name: string
}

export interface ScenarioCardData {
  id: string
  title: string
  description: string
  difficulty: string
  commanders: string[]
  updatedAt: string
  published: boolean
  author?: ScenarioCardAuthor | null
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/** The scenario card used by the home feed and the search results page. */
export function ScenarioCard({ s }: { s: ScenarioCardData }) {
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
        {/* Not a link: there is no author page yet. See .cardAuthor in the CSS. */}
        {s.author && <span className={styles.cardAuthor}>by {s.author.name}</span>}
      </div>
    </Link>
  )
}

export function ScenarioCardSkeleton() {
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
