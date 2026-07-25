import { ContentPage } from '@/components/shell/ContentPage'
import styles from '@/components/shell/ContentPage.module.css'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <ContentPage title="What is TrainingARK?">
      <section className={styles.section}>
        <p className={styles.body}>
          TrainingARK is an interactive training simulator for competitive Commander (cEDH).
          It presents real game states across four players and asks you to make decisions:
          when to interact, when to go for the win, when to hold up mana. Scenarios are taken
          from real games to help you recognize situations and learn the correct lines.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Why it exists</h2>
        <p className={styles.body}>
          Chess has hundreds of puzzle and training apps. cEDH has nothing equivalent. Most
          resources either cover casual EDH or track tournament results without teaching the
          decisions behind them. The hardest part of improving at cEDH is that most blunders
          go unnoticed. You pass priority at the wrong time, misread a threat, or tap out a
          turn too early and never know it cost you the game. TrainingARK is built to make
          those moments visible.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>How to use it</h2>
        <p className={styles.body}>
          Browse scenarios on the home page, filtered by difficulty. Each scenario shows a
          full board state with real card images. Hover any card to preview it. Read the
          position, make your decision, and see how you did.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Who am I?</h2>
        <p className={styles.body}>
          I have been playing Magic for five years and cEDH for just over two. In that time
          I attended several tournaments at my local game store. Getting better at cEDH through
          live tournament play is expensive. Entry fees, travel, time, and most of what you
          learn comes from losing without fully understanding why. Bigger tournaments are even
          more brutal if you are not ready for them. Most players cannot afford to grind that
          experience fast enough for it to matter.
        </p>
        <p className={styles.body}>
          TrainingARK is meant to be the free alternative. A place where players can share
          real scenarios, study real decisions, and learn from each other without it costing
          anything. The goal is simple: help players get better at cEDH without having to
          pay for every lesson.
        </p>
      </section>
    </ContentPage>
  )
}