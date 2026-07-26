import Link from 'next/link'
import { ScenarioSaveControls } from './ScenarioSaveControls'
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
    // The save controls are a sibling of the link, not a child: a button
    // cannot legally nest inside an anchor. The wrapper is what lets them
    // float over the thumbnail.
    <div className={styles.cardWrap}>
      <ScenarioSaveControls scenarioId={s.id} variant="card" />
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
    </div>
  )
}

/**
 * Stand-in for a saved scenario that has since been deleted. Same tile
 * footprint as ScenarioCard so a bookmarks or playlist grid stays uniform,
 * with the greyed treatment and wording the history page already uses for
 * orphaned attempts.
 */
export function UnavailableCard({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className={styles.cardWrap}>
      {action}
      <div className={styles.card}>
        <div className={`${styles.cardThumb} ${styles.cardThumbGone}`} />
        <div className={styles.cardBody}>
          <span className={`${styles.cardTitle} ${styles.cardTitleGone}`}>{title}</span>
          <span className={styles.cardUnavailable}>Scenario no longer available</span>
        </div>
      </div>
    </div>
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
