'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import styles from './Sidebar.module.css'

interface SidebarProps {
  open: boolean
}

interface NavItem {
  href: string
  label: string
  icon: string
}

const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/builder', label: 'Create', icon: '✎' },
]

const AUTH_NAV: NavItem[] = [
  { href: '/dashboard', label: 'You', icon: '☺' },
  { href: '/history', label: 'History', icon: '↺' },
]

const EXPLORE_NAV: NavItem[] = [
  { href: '/tutorial', label: 'Tutorial', icon: '◈' },
  { href: '/rules', label: 'Rules & Banlist', icon: '§' },
  { href: '/about', label: 'About', icon: 'ⓘ' },
]

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  function renderItem(item: NavItem) {
    const active = pathname === item.href
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navItem} ${active ? styles.navItemActive : ''} ${!open ? styles.navItemCollapsed : ''}`}
        title={!open ? item.label : undefined}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        {open && <span className={styles.navLabel}>{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : styles.sidebarCollapsed}`}>
      <nav className={styles.navSection}>
        {MAIN_NAV.map(renderItem)}
      </nav>

      <div className={styles.divider} />

      {user ? (
        <>
          <nav className={styles.navSection}>
            {open && <span className={styles.sectionTitle}>You</span>}
            {AUTH_NAV.map(renderItem)}
          </nav>
          <div className={styles.divider} />
        </>
      ) : (
        open && (
          <>
            <div className={styles.signInPrompt}>
              <p className={styles.signInText}>Sign in to follow Arkitekts and track your progress.</p>
              <Link href="/login" className={styles.signInBtn}>Sign in</Link>
            </div>
            <div className={styles.divider} />
          </>
        )
      )}

      <nav className={styles.navSection}>
        {open && <span className={styles.sectionTitle}>Explore</span>}
        {EXPLORE_NAV.map(renderItem)}
      </nav>
    </aside>
  )
}