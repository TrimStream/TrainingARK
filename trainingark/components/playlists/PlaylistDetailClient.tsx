'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import {
  ScenarioCard,
  ScenarioCardSkeleton,
  UnavailableCard,
  type ScenarioCardData,
} from '@/components/scenarios/ScenarioCard'
import styles from './PlaylistDetailClient.module.css'

interface PlaylistItemRow {
  id: string
  scenarioId: string | null
  available: boolean
  title: string
  scenario: ScenarioCardData | null
}

interface PlaylistDetail {
  id: string
  name: string
  description: string | null
  public: boolean
  items: PlaylistItemRow[]
}

export function PlaylistDetailClient({ playlistId }: { playlistId: string }) {
  const router = useRouter()
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/playlists/${playlistId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setPlaylist)
      .catch(err => {
        console.error('Failed to load playlist:', err)
        setError('Could not load this playlist.')
      })
      .finally(() => setLoading(false))
  }, [playlistId])

  // Live entries are removed by scenario id; an orphan has none left, so it
  // goes by its own item id — the route accepts either.
  async function handleRemove(item: PlaylistItemRow) {
    if (removingId) return
    setRemovingId(item.id)
    setError(null)
    try {
      const target = item.scenarioId ?? item.id
      const res = await fetch(
        `/api/playlists/${playlistId}/items/${encodeURIComponent(target)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPlaylist(p => p && { ...p, items: p.items.filter(i => i.id !== item.id) })
    } catch (err) {
      console.error('Could not remove that scenario:', err)
      setError('Could not remove that scenario from the playlist.')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleToggleVisibility() {
    if (!playlist || savingVisibility) return
    const next = !playlist.public
    setSavingVisibility(true)
    setError(null)
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setPlaylist(p => p && { ...p, public: body.public })
    } catch (err) {
      console.error('Could not change visibility:', err)
      setError('Could not change the playlist visibility.')
    } finally {
      setSavingVisibility(false)
    }
  }

  async function handleDeletePlaylist() {
    if (!playlist || deleting) return
    // Same confirmation shape as the dashboard's scenario delete.
    const confirmed = window.confirm(
      `Delete the playlist "${playlist.name}" permanently? This cannot be undone. The scenarios in it are not deleted.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.push('/dashboard')
    } catch (err) {
      console.error('Could not delete the playlist:', err)
      setError('Could not delete the playlist.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className={styles.page}>
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => <ScenarioCardSkeleton key={i} />)}
          </div>
        </div>
      </AppShell>
    )
  }

  if (!playlist) {
    return (
      <AppShell>
        <div className={styles.page}>
          <Link href="/dashboard" className={styles.backLink}>← Back to your library</Link>
          <p className={styles.stateTextError}>{error ?? 'This playlist could not be found.'}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <Link href="/dashboard" className={styles.backLink}>← Back to your library</Link>

        <div className={styles.header}>
          <div className={styles.headerBody}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{playlist.name}</h1>
              <span className={`${styles.statusBadge} ${playlist.public ? styles.statusPublic : styles.statusPrivate}`}>
                {playlist.public ? 'Public' : 'Private'}
              </span>
            </div>
            {playlist.description && <p className={styles.description}>{playlist.description}</p>}
            <span className={styles.count}>
              {playlist.items.length} {playlist.items.length === 1 ? 'scenario' : 'scenarios'}
            </span>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.visibilityBtn}
              onClick={() => { void handleToggleVisibility() }}
              disabled={savingVisibility}
              title={playlist.public ? 'Make this playlist private' : 'Make this playlist public'}
            >
              {savingVisibility ? 'Saving...' : playlist.public ? 'Make private' : 'Make public'}
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => { void handleDeletePlaylist() }}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete playlist'}
            </button>
          </div>
        </div>

        {error && <p className={styles.stateTextError}>{error}</p>}

        {playlist.items.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>This playlist is empty</h2>
            <p className={styles.emptyText}>
              Use the + on any scenario to add it here.
            </p>
            <Link href="/" className={styles.emptyBtn}>Browse scenarios</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {playlist.items.map(item => {
              const removeBtn = (
                <button
                  className={`${styles.removeBtn} ${item.scenario ? '' : styles.removeBtnAlone}`}
                  onClick={() => { void handleRemove(item) }}
                  disabled={removingId === item.id}
                  title="Remove from this playlist"
                  aria-label={`Remove ${item.title} from this playlist`}
                >
                  ×
                </button>
              )

              // Scenario deleted since it was added: the playlist entry
              // survives with its title snapshot.
              if (!item.scenario) {
                return <UnavailableCard key={item.id} title={item.title} action={removeBtn} />
              }

              return (
                <div key={item.id} className={styles.itemCell}>
                  {removeBtn}
                  <ScenarioCard s={item.scenario} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
