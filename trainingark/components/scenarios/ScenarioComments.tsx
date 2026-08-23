'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import type { CommentReportReasonValue, PublicScenarioComment } from '@/lib/scenarioComment'
import styles from './ScenarioComments.module.css'

export function ScenarioComments({ scenarioId }: { scenarioId: string }) {
  const { user, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<PublicScenarioComment[]>([])
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/comments`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ comments: PublicScenarioComment[] }>
      })
      .then(result => { if (!cancelled) setComments(result.comments) })
      .catch(err => {
        console.error('Could not load scenario comments:', err)
        if (!cancelled) setError('Comments are unavailable.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [scenarioId])

  async function addComment(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || busyId) return
    setBusyId('new')
    setError('')
    try {
      const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not add comment')
      setComments(current => [...current, result.comment])
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add comment')
    } finally {
      setBusyId(null)
    }
  }

  async function saveEdit(id: string) {
    if (!editingBody.trim()) return
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: editingBody }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not edit comment')
      setComments(current => current.map(comment => comment.id === id ? result.comment : comment))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not edit comment')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteComment(id: string) {
    if (!window.confirm('Delete your comment?')) return
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not delete comment')
      setComments(current => current.map(comment => comment.id === id
        ? { ...comment, body: null, status: 'DELETED' as const }
        : comment))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete comment')
    } finally {
      setBusyId(null)
    }
  }

  async function reportComment(id: string) {
    const rawReason = window.prompt('Report reason: spam, harassment, hate, or other')
    if (!rawReason) return
    const reason = rawReason.trim().toUpperCase() as CommentReportReasonValue
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not submit report')
      window.alert('Report submitted for platform review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report')
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = comments.filter(comment => comment.status === 'ACTIVE').length

  return (
    <>
      <button className={styles.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
        Comments {activeCount > 0 && <span>{activeCount}</span>}
      </button>
      {open && (
        <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="comments-title">
            <header className={styles.header}>
              <div>
                <h2 id="comments-title">Scenario discussion</h2>
                <p>Share strategy and constructive criticism.</p>
              </div>
              <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close comments">×</button>
            </header>

            <div className={styles.list}>
              {loading && <p className={styles.muted}>Loading comments...</p>}
              {!loading && comments.length === 0 && <p className={styles.muted}>Start the discussion.</p>}
              {comments.map(comment => (
                <article className={styles.comment} key={comment.id}>
                  <div className={styles.commentHeader}>
                    <Link href={`/arkitekts/${comment.author.id}`}>{comment.author.name}</Link>
                    <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time>
                  </div>
                  {comment.status !== 'ACTIVE' ? (
                    <p className={styles.deleted}>Comment deleted by its author.</p>
                  ) : editingId === comment.id ? (
                    <div className={styles.editBox}>
                      <textarea value={editingBody} maxLength={2000} onChange={event => setEditingBody(event.target.value)} />
                      <div className={styles.actions}>
                        <button onClick={() => { void saveEdit(comment.id) }} disabled={busyId === comment.id}>Save</button>
                        <button onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.body}>{comment.body}</p>
                      {user?.id === comment.author.id ? (
                        <div className={styles.actions}>
                          <button onClick={() => { setEditingId(comment.id); setEditingBody(comment.body || '') }}>Edit</button>
                          <button onClick={() => { void deleteComment(comment.id) }} disabled={busyId === comment.id}>Delete</button>
                        </div>
                      ) : user ? (
                        <div className={styles.actions}>
                          <button onClick={() => { void reportComment(comment.id) }} disabled={busyId === comment.id}>Report</button>
                        </div>
                      ) : null}
                    </>
                  )}
                </article>
              ))}
            </div>

            <footer className={styles.composer}>
              {authLoading ? null : user ? (
                <form onSubmit={addComment}>
                  <textarea value={body} maxLength={2000} placeholder="Add to the discussion..." onChange={event => setBody(event.target.value)} />
                  <button type="submit" disabled={!body.trim() || busyId === 'new'}>Post comment</button>
                </form>
              ) : (
                <p><Link href={`/login?callbackUrl=${encodeURIComponent(`/scenario/${scenarioId}`)}`}>Sign in</Link> to comment.</p>
              )}
              {error && <p className={styles.error} role="alert">{error}</p>}
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
