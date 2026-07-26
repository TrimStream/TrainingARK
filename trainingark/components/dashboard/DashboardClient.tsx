'use client'

import { useState } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { ScenariosTab } from './ScenariosTab'
import { BookmarksTab } from './BookmarksTab'
import { PlaylistsTab } from './PlaylistsTab'
import styles from './DashboardClient.module.css'

type Tab = 'scenarios' | 'bookmarks' | 'playlists'

const TABS: { id: Tab; label: string }[] = [
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'playlists', label: 'Playlists' },
]

export function DashboardClient() {
  const [tab, setTab] = useState<Tab>('scenarios')

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your library</h1>
        </div>

        {/* Only the active tab is mounted, so each one fetches on first open
            rather than all three on page load. */}
        <div className={styles.tabs} role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'bookmarks' && <BookmarksTab />}
        {tab === 'playlists' && <PlaylistsTab />}
      </div>
    </AppShell>
  )
}
