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
  onToggleTapped: () => void
  onClose: () => void
  currentZone: EditableZone
}

export function CardContextMenu({ x, y, cardName, onMove, onCastToStack, onClose, currentZone }: CardContextMenuProps) {
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

  // Helper to map ZoneTarget to EditableZone for comparison
  const getTargetZone = (target: ZoneTarget): EditableZone => {
    if (target === 'library-top' || target === 'library-bottom') return 'library'
    return target
  }

  // Disabled states for move options
  const isMoveToBattlegroundDisabled = getTargetZone('battlefield') === currentZone
  const isMoveToHandDisabled = getTargetZone('hand') === currentZone
  const isMoveToGraveyardDisabled = getTargetZone('graveyard') === currentZone
  const isMoveToExileDisabled = getTargetZone('exile') === currentZone
  const isMoveToLibraryDisabled = getTargetZone('library-top') === currentZone // same for bottom

  const menu = (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className={styles.menuHeader}>{cardName}</div>
      <div className={styles.menuDivider} />
      <button
        className={styles.menuItem}
        disabled={isMoveToBattlegroundDisabled}
        onClick={() => { onMove('battlefield'); onClose() }}
      >
        Move to Battlefield <span className={styles.kbd}>B</span>
      </button>
      <button
        className={styles.menuItem}
        disabled={isMoveToHandDisabled}
        onClick={() => { onMove('hand'); onClose() }}
      >
        Move to Hand <span className={styles.kbd}>H</span>
      </button>
      <button
        className={styles.menuItem}
        disabled={isMoveToGraveyardDisabled}
        onClick={() => { onMove('graveyard'); onClose() }}
      >
        Move to Graveyard <span className={styles.kbd}>G</span>
      </button>
      <button
        className={styles.menuItem}
        disabled={isMoveToExileDisabled}
        onClick={() => { onMove('exile'); onClose() }}
      >
        Move to Exile <span className={styles.kbd}>E</span>
      </button>
      <button
        className={styles.menuItem}
        disabled={isMoveToLibraryDisabled}
        onClick={() => { onMove('library-top'); onClose() }}
      >
        Move to Top of Library <span className={styles.kbd}>L</span>
      </button>
      <button
        className={styles.menuItem}
        disabled={isMoveToLibraryDisabled}
        onClick={() => { onMove('library-bottom'); onClose() }}
      >
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