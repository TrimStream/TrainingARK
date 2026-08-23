'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { PublicNotification } from '@/lib/subscription'
import styles from './NotificationBell.module.css'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<PublicNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then(result => { setNotifications(result.notifications); setUnread(result.unread); setLoaded(true) })
      .catch(err => console.error('Could not load notifications:', err))
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setNotifications(current => current.map(notification => ({ ...notification, read: true })))
      fetch('/api/notifications', { method: 'PATCH' }).catch(err => console.error('Could not mark notifications read:', err))
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button className={styles.bell} onClick={toggle} aria-label={`${unread} unread notifications`} aria-haspopup="menu" aria-expanded={open}>
        ♢
        {unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className={styles.panel} role="menu">
          <h2>Notifications</h2>
          {!loaded && <p className={styles.empty}>Loading...</p>}
          {loaded && notifications.length === 0 && <p className={styles.empty}>No notifications yet.</p>}
          {notifications.map(notification => {
            const href = notification.type === 'NEW_FOLLOWER'
              ? `/arkitekts/${notification.actor.id}`
              : notification.scenario?.id ? `/scenario/${notification.scenario.id}` : `/arkitekts/${notification.actor.id}`
            return (
              <Link href={href} key={notification.id} className={`${styles.item} ${!notification.read ? styles.unread : ''}`} onClick={() => setOpen(false)} role="menuitem">
                <strong>{notification.actor.name}</strong>{' '}
                {notification.type === 'NEW_FOLLOWER'
                  ? 'followed you.'
                  : <>published <em>{notification.scenario?.title}</em>.</>}
                <time>{new Date(notification.createdAt).toLocaleDateString()}</time>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
