'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useAuth } from '@/lib/useAuth'
import { TarkLogo } from './TarkLogo'
import styles from './TopBar.module.css'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

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
          <div className={styles.userMenuWrap} ref={menuRef}>
            <button
              className={styles.avatar}
              onClick={() => setMenuOpen(o => !o)}
              title={user.username}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {user.avatarInitial}
            </button>
            {menuOpen && (
              <div className={styles.userMenu} role="menu">
                <span className={styles.userMenuName}>{user.username}</span>
                <button
                  className={styles.userMenuItem}
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className={styles.signInPill}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}