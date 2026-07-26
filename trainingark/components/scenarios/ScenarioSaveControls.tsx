'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useBookmarks } from './BookmarksProvider'
import styles from './ScenarioSaveControls.module.css'

interface PlaylistRow {
  id: string
  name: string
  itemCount: number
  contains?: boolean
}

interface ScenarioSaveControlsProps {
  scenarioId: string
  /** 'card' floats over a thumbnail; 'header' sits inline in the viewer bar. */
  variant?: 'card' | 'header'
}

export function ScenarioSaveControls({ scenarioId, variant = 'card' }: ScenarioSaveControlsProps) {
  const { user } = useAuth()
  const bookmarks = useBookmarks()

  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistRow[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPublic, setNewPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)

  // Same outside-click pattern as the top bar's menus.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Playlists load lazily, only once the popover is actually opened.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    fetch(`/api/playlists?scenarioId=${encodeURIComponent(scenarioId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((rows: PlaylistRow[]) => { if (!cancelled) setPlaylists(rows) })
      .catch(err => {
        if (cancelled) return
        console.error('Could not load your playlists:', err)
        setError('Could not load your playlists.')
      })

    return () => { cancelled = true }
  }, [open, scenarioId])

  // Signed-out visitors get no save affordance at all, matching how the
  // sidebar hides its signed-in section outright.
  if (!user || !bookmarks) return null

  const bookmarked = bookmarks.isBookmarked(scenarioId)

  /** Card-variant controls sit inside a link; never let a click navigate. */
  function swallow(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleTogglePlaylist(playlist: PlaylistRow) {
    if (busyId) return
    setBusyId(playlist.id)
    setError(null)
    const nowContains = !playlist.contains

    try {
      const res = nowContains
        ? await fetch(`/api/playlists/${playlist.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId }),
          })
        : await fetch(`/api/playlists/${playlist.id}/items/${scenarioId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setPlaylists(list => (list ?? []).map(p => p.id === playlist.id
        ? { ...p, contains: nowContains, itemCount: p.itemCount + (nowContains ? 1 : -1) }
        : p))
    } catch (err) {
      console.error('Could not update that playlist:', err)
      setError('Could not update that playlist.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving || newName.trim().length === 0) return
    setSaving(true)
    setError(null)

    try {
      // scenarioId seeds the new playlist with the scenario in hand, so
      // creating from here adds it in one step.
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          public: newPublic,
          scenarioId,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Could not create the playlist.')
        return
      }

      setPlaylists(list => [body as PlaylistRow, ...(list ?? [])])
      setCreating(false)
      setNewName('')
      setNewDescription('')
      setNewPublic(false)
    } catch (err) {
      console.error('Could not create the playlist:', err)
      setError('Could not create the playlist.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`${styles.controls} ${variant === 'card' ? styles.controlsCard : styles.controlsHeader}`}
      onClick={swallow}
    >
      <button
        className={`${styles.iconBtn} ${bookmarked ? styles.iconBtnActive : ''}`}
        onClick={e => { swallow(e); void bookmarks.toggle(scenarioId) }}
        title={bookmarked ? 'Remove bookmark' : 'Bookmark this scenario'}
        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this scenario'}
        aria-pressed={bookmarked}
      >
        {bookmarked ? '★' : '☆'}
      </button>

      <button
        className={`${styles.iconBtn} ${open ? styles.iconBtnActive : ''}`}
        onClick={e => { swallow(e); setOpen(o => !o) }}
        title="Add to playlist"
        aria-label="Add to playlist"
        aria-expanded={open}
      >
        +
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.popoverTitle}>Add to playlist</div>

          {error && <p className={styles.popoverError}>{error}</p>}

          {playlists === null ? (
            <p className={styles.popoverHint}>Loading...</p>
          ) : playlists.length === 0 ? (
            <p className={styles.popoverHint}>No playlists yet.</p>
          ) : (
            playlists.map(p => (
              <button
                key={p.id}
                className={styles.playlistRow}
                onClick={e => { swallow(e); void handleTogglePlaylist(p) }}
                disabled={busyId === p.id}
              >
                <span className={`${styles.checkbox} ${p.contains ? styles.checkboxOn : ''}`}>
                  {p.contains ? '✓' : ''}
                </span>
                <span className={styles.playlistName}>{p.name}</span>
                <span className={styles.playlistCount}>{p.itemCount}</span>
              </button>
            ))
          )}

          <div className={styles.popoverDivider} />

          {creating ? (
            <form className={styles.form} onSubmit={handleCreate}>
              <input
                className={styles.input}
                placeholder="Playlist name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={60}
                autoFocus
                required
              />
              <input
                className={styles.input}
                placeholder="Description (optional)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                maxLength={300}
              />
              <label className={styles.visibilityRow} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={e => setNewPublic(e.target.checked)}
                />
                Public
              </label>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={e => { swallow(e); setCreating(false) }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.createBtn}
                  disabled={saving || newName.trim().length === 0}
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <button
              className={styles.playlistRow}
              onClick={e => { swallow(e); setCreating(true) }}
            >
              <span className={styles.checkbox}>+</span>
              <span className={styles.playlistName}>New playlist</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
