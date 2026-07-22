'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { TarkLogo } from './TarkLogo'
import styles from './TopBar.module.css'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={onToggleSidebar} title="Toggle menu" aria-label="Toggle menu">
          ☰
        </button>
        <Link href="/" className={styles.brand} aria-label="TrainingARK home">
          <TarkLogo size="small" />
        </Link>
      </div>

      <div className={styles.searchWrap}>
        {/* Placeholder search — not wired yet */}
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search scenarios..."
          disabled
        />
        <button className={styles.searchBtn} disabled aria-label="Search">⌕</button>
      </div>

      <div className={styles.right}>
        {user ? (
          <div className={styles.avatar}>{user.avatarInitial}</div>
        ) : (
          <Link href="/login" className={styles.signInPill}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}