'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useAuth } from '@/lib/useAuth'
import type { ScenarioCardData } from '@/components/scenarios/ScenarioCard'
import { TarkLogo } from './TarkLogo'
import styles from './TopBar.module.css'

interface TopBarProps {
  onToggleSidebar: () => void
}

const SUGGESTION_LIMIT = 8
const DEBOUNCE_MS = 275

// A suggestion is only ever a piece of text to search for — never a link to a
// scenario or an author. `kind` exists purely to label the row.
interface Suggestion {
  kind: 'scenario' | 'author'
  text: string
}

/**
 * Scenario titles, then the distinct authors of those same results. Deduped
 * case-insensitively so one author with several matches contributes one row.
 */
function buildSuggestions(results: ScenarioCardData[]): Suggestion[] {
  const titles: Suggestion[] = results.map(s => ({ kind: 'scenario', text: s.title }))

  const authors: Suggestion[] = []
  const seen = new Set<string>()
  for (const s of results) {
    const name = s.author?.name
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    authors.push({ kind: 'author', text: name })
  }

  return [...titles, ...authors].slice(0, SUGGESTION_LIMIT)
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  // Tagged with the query it was fetched for, so suggestions for an older
  // keystroke are never shown against newer input.
  const [fetched, setFetched] = useState<{ query: string; items: Suggestion[] }>({ query: '', items: [] })
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  // Same outside-click pattern as the user menu above.
  useEffect(() => {
    if (!suggestOpen) return
    function onPointerDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [suggestOpen])

  // Typing only fetches suggestions — it never navigates. The trailing cleanup
  // cancels the in-flight timer, so only the last keystroke in a 275ms window
  // reaches the API.
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return

    let cancelled = false
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${SUGGESTION_LIMIT}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((results: ScenarioCardData[]) => {
          if (cancelled) return
          setFetched({ query: trimmed, items: buildSuggestions(results) })
          setActiveIndex(-1)
        })
        .catch(err => {
          if (cancelled) return
          console.error('Search suggestions failed:', err)
          setFetched({ query: trimmed, items: [] })
        })
    }, DEBOUNCE_MS)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  // Only render suggestions that belong to what is currently typed.
  const trimmedQuery = query.trim()
  const suggestions = fetched.query === trimmedQuery ? fetched.items : []

  // The one place a search is actually executed. Suggestion rows and Enter both
  // land here, so clicking a row is identical to typing that text and pressing
  // Enter.
  function runSearch(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setSuggestOpen(false)
    setActiveIndex(-1)
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setSuggestOpen(false); setActiveIndex(-1); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const picked = activeIndex >= 0 ? suggestions[activeIndex] : undefined
      runSearch(picked ? picked.text : query)
      return
    }
    if (!suggestOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    }
  }

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

      <div className={styles.searchWrap} ref={searchRef}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search scenarios, commanders, Arkitekts..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSuggestOpen(true) }}
          onFocus={() => setSuggestOpen(true)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Search"
          autoComplete="off"
        />
        <button
          className={styles.searchBtn}
          onClick={() => runSearch(query)}
          disabled={trimmedQuery.length === 0}
          aria-label="Search"
        >
          ⌕
        </button>

        {suggestOpen && trimmedQuery.length > 0 && suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((suggestion, i) => (
              <button
                key={`${suggestion.kind}-${suggestion.text}`}
                className={`${styles.suggestionItem} ${i === activeIndex ? styles.suggestionItemActive : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => runSearch(suggestion.text)}
              >
                <span className={`${styles.suggestionKind} ${suggestion.kind === 'author' ? styles.suggestionKindAuthor : ''}`}>
                  {suggestion.kind === 'author' ? 'Arkitekt' : 'Scenario'}
                </span>
                <span className={styles.suggestionText}>{suggestion.text}</span>
              </button>
            ))}
          </div>
        )}
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
                <Link
                  href="/dashboard"
                  className={styles.userMenuItem}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className={styles.userMenuItem}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <div className={styles.userMenuDivider} />
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