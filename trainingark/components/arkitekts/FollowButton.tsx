'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import styles from './FollowButton.module.css'

interface FollowSummary { followers: number; following: boolean }

export function FollowButton({ arkitektId }: { arkitektId: string }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [summary, setSummary] = useState<FollowSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/arkitekts/${encodeURIComponent(arkitektId)}/follow`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(value => { if (!cancelled) setSummary(value) })
      .catch(err => { console.error('Could not load follow status:', err); if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [arkitektId])

  async function toggleFollow() {
    if (!summary || busy || authLoading) return
    if (!user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/arkitekts/${arkitektId}`)}`)
      return
    }
    setBusy(true)
    setError(false)
    try {
      const res = await fetch(`/api/arkitekts/${encodeURIComponent(arkitektId)}/follow`, {
        method: summary.following ? 'DELETE' : 'PUT',
      })
      const value = await res.json()
      if (!res.ok) throw new Error(value.error || 'Could not update subscription')
      setSummary(value)
    } catch (err) {
      console.error('Could not update follow:', err)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (!summary) return <span className={styles.loading}>{error ? 'Followers unavailable' : 'Loading followers...'}</span>

  return (
    <div className={styles.wrap}>
      <span className={styles.count}>{summary.followers} {summary.followers === 1 ? 'follower' : 'followers'}</span>
      {user?.id !== arkitektId && (
        <button className={`${styles.button} ${summary.following ? styles.following : ''}`} onClick={() => { void toggleFollow() }} disabled={busy || authLoading}>
          {summary.following ? 'Following' : 'Follow'}
        </button>
      )}
      {error && <span className={styles.error}>Could not update</span>}
    </div>
  )
}
