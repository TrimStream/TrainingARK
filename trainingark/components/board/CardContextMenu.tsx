'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './CardContextMenu.module.css'

export type ZoneTarget =
  | 'battlefield'
  | 'hand'
  | 'graveyard'
  | 'exile'
  | 'library-top'
  | 'library-bottom'

export type StackType = 'cast' | 'triggered' | 'activated'

interface CardContextMenuProps {
  x: number
  y: number
  cardName: string
  onMove: (target: ZoneTarget) => void
  onCastToStack: (type: StackType) => void
  onClose: () => void
}

export function CardContextMenu({ x, y, cardName, onMove, onCastToStack, onClose }: CardContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
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

  // Adjust position so menu doesn't go off screen
  const menuWidth = 200
  const menuHeight = 280
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y

  const menu = (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className={styles.menuHeader}>{cardName}</div>
      <div className={styles.menuDivider} />
      <button className={styles.menuItem} onClick={() => { onMove('battlefield'); onClose() }}>
        Move to Battlefield <kbd>B</kbd>
      </button>
      <button className={styles.menuItem} onClick={() => { onMove('hand'); onClose() }}>
        Move to Hand <kbd>H</kbd>
      </button>
      <button className={styles.menuItem} onClick={() => { onMove('graveyard'); onClose() }}>
        Move to Graveyard <kbd>G</kbd>
      </button>
      <button className={styles.menuItem} onClick={() => { onMove('exile'); onClose() }}>
        Move to Exile <kbd>E</kbd>
      </button>
      <button className={styles.menuItem} onClick={() => { onMove('library-top'); onClose() }}>
        Move to Top of Library <kbd>L</kbd>
      </button>
      <button className={styles.menuItem} onClick={() => { onMove('library-bottom'); onClose() }}>
        Move to Bottom of Library
      </button>
      <div className={styles.menuDivider} />
      <button className={styles.menuItem} onClick={() => { onCastToStack('cast'); onClose() }}>
        Cast to Stack
      </button>
      <button className={styles.menuItem} onClick={() => { onCastToStack('triggered'); onClose() }}>
        Add Triggered Ability
      </button>
      <button className={styles.menuItem} onClick={() => { onCastToStack('activated'); onClose() }}>
        Add Activated Ability
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}