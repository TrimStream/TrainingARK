import { ContentPage } from '@/components/shell/ContentPage'
import styles from '@/components/shell/ContentPage.module.css'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'TrainingARK' }

export default function RulesPage() {
  return (
    <ContentPage title="Rules Reference">
      <p className={styles.body}>
        This page will contain a full reference for competitive Commander including the
        official rules, the current ban list, and rulings relevant to common cEDH interactions.
      </p>

      <section className={styles.section}>
        <h2 className={styles.heading}>What&apos;s coming</h2>
        <ul className={styles.list}>
          <li>Official Commander rules and format guidelines</li>
          <li>Current EDH ban list updated for the latest announcements</li>
          <li>Comprehensive rules reference for common cEDH interactions</li>
          <li>Priority, the stack, and timing rules explained for competitive play</li>
        </ul>
      </section>
    </ContentPage>
  )
}