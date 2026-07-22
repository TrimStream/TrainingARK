'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import styles from './AppShell.module.css'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className={styles.shell}>
      <TopBar onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <div className={styles.body}>
        <Sidebar open={sidebarOpen} />
        <main className={`${styles.content} ${sidebarOpen ? styles.contentSidebarOpen : styles.contentSidebarCollapsed}`}>
          {children}
        </main>
      </div>
    </div>
  )
}