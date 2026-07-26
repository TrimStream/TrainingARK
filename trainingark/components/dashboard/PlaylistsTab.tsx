'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './DashboardClient.module.css'

interface PlaylistRow {
  id: string
  name: string
  description: string | null
  public: boolean
  updatedAt: string
  itemCount: number
}

export function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/playlists')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setPlaylists)
      .catch(err => {
        console.error('Failed to load your playlists:', err)
        setError('Could not load your playlists. Try refreshing.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Standalone creation: no scenarioId, so the playlist starts empty.
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (saving || name.trim().length === 0) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, public: isPublic }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Could not create the playlist.')
        return
      }
      setPlaylists(list => [body as PlaylistRow, ...list])
      setCreating(false)
      setName('')
      setDescription('')
      setIsPublic(false)
    } catch (err) {
      console.error('Could not create the playlist:', err)
      setError('Could not create the playlist.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionCount}>
          {!loading && playlists.length > 0 && (
            `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`
          )}
        </span>
        {!creating && (
          <div className={styles.headerActions}>
            <button className={styles.newBtn} onClick={() => setCreating(true)}>
              Create playlist
            </button>
          </div>
        )}
      </div>

      {error && <p className={styles.stateTextError}>{error}</p>}

      {creating && (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <input
            className={styles.filterInput}
            placeholder="Playlist name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            autoFocus
            required
          />
          <input
            className={styles.filterInput}
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={300}
          />
          <label className={styles.visibilityRow}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
            />
            Public
          </label>
          <div className={styles.createFormActions}>
            <button type="button" className={styles.viewBtn} onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.newBtn}
              disabled={saving || name.trim().length === 0}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className={styles.playlistList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${styles.playlistRow} ${styles.skeleton}`} style={{ height: 58 }} />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        !creating && (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No playlists yet</h2>
            <p className={styles.emptyText}>
              Group scenarios into a set — a pod archetype, a practice list, a teaching sequence.
            </p>
            <button className={styles.emptyBtn} onClick={() => setCreating(true)}>
              Create playlist
            </button>
          </div>
        )
      ) : (
        <div className={styles.playlistList}>
          {playlists.map(p => (
            <Link key={p.id} href={`/playlists/${p.id}`} className={styles.playlistRow}>
              <div className={styles.playlistBody}>
                <span className={styles.playlistName}>{p.name}</span>
                {p.description && <span className={styles.playlistDesc}>{p.description}</span>}
              </div>
              <span className={`${styles.statusBadge} ${p.public ? styles.statusPublished : styles.statusDraft}`}>
                {p.public ? 'Public' : 'Private'}
              </span>
              <span className={styles.playlistCount}>
                {p.itemCount} {p.itemCount === 1 ? 'scenario' : 'scenarios'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
