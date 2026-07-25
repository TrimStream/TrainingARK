import { ContentPage } from '@/components/shell/ContentPage'
import styles from '@/components/shell/ContentPage.module.css'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tutorial' }

export default function TutorialPage() {
  return (
    <ContentPage title="Tutorial">
      <p className={styles.body}>
        This page will walk you through everything you need to know to start playing cEDH
        and get the most out of TrainingARK.
      </p>

      <section className={styles.section}>
        <h2 className={styles.heading}>What&apos;s coming</h2>
        <ul className={styles.list}>
          <li>What makes cEDH different from casual Commander</li>
          <li>How to read a board state and assess threats</li>
          <li>Interaction timing and stack fundamentals</li>
          <li>How to use the scenario trainer effectively</li>
          <li>Mulligan philosophy in competitive Commander</li>
          <li>Politics and table talk at a competitive table</li>
        </ul>
      </section>
    </ContentPage>
  )
}