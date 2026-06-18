'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './ZoneMenu.module.css'

export interface ZoneMenuItem {
  label: string
  action: () => void
  danger?: boolean
}

interface ZoneMenuProps {
  x: number
  y: number
  items: ZoneMenuItem[]
  onClose: () => void
}

export function ZoneMenu({ x, y, items, onClose }: ZoneMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const menuWidth = 200
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
  const adjustedY = y + items.length * 36 > window.innerHeight ? y - items.length * 36 : y

  return createPortal(
    <div ref={ref} className={styles.menu} style={{ left: adjustedX, top: adjustedY }}>
      {items.map((item, i) => (
        <button
          key={i}
          className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
          onClick={() => {
            item.action()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}


