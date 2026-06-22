'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './CardContextMenu.module.css'
import type { EditableZone } from '@/store/builderStore'
import type { Card } from '@/types/board'

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
  cardType: Card['cardType']
  isToken?: boolean
  onMove: (target: ZoneTarget) => void
  onCastToStack: (type: StackType) => void
  onRemove: () => void
  onCreateTokenCopy?: () => void
  onClose: () => void
  currentZone: EditableZone
}

export function CardContextMenu({
  x, y, cardName, cardType, onMove, onCastToStack, onRemove, onCreateTokenCopy, onClose, currentZone,
}: CardContextMenuProps) {
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

  const menuWidth = 200
  const menuHeight = 320
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y

  // Lands never use the stack -- they just move straight to the battlefield.
  const isLand = cardType === 'land'
  // From the battlefield, a permanent is already in play -- only its triggered/activated
  // abilities make sense, not "cast" again.
  const onBattlefield = currentZone === 'battlefield'

  const menu = (
    <div ref={ref} className={styles.menu} style={{ left: adjustedX, top: adjustedY }}>
      <div className={styles.menuHeader}>{cardName}</div>
      <div className={styles.menuDivider} />

      {currentZone !== 'battlefield' && (
        <button className={styles.menuItem} onClick={() => { onMove('battlefield'); onClose() }}>
          Move to Battlefield <span className={styles.kbd}>B</span>
        </button>
      )}
      {currentZone !== 'hand' && (
        <button className={styles.menuItem} onClick={() => { onMove('hand'); onClose() }}>
          Move to Hand <span className={styles.kbd}>H</span>
        </button>
      )}
      {currentZone !== 'graveyard' && (
        <button className={styles.menuItem} onClick={() => { onMove('graveyard'); onClose() }}>
          Move to Graveyard <span className={styles.kbd}>G</span>
        </button>
      )}
      {currentZone !== 'exile' && (
        <button className={styles.menuItem} onClick={() => { onMove('exile'); onClose() }}>
          Move to Exile <span className={styles.kbd}>E</span>
        </button>
      )}
      {currentZone !== 'library' && (
        <button className={styles.menuItem} onClick={() => { onMove('library-top'); onClose() }}>
          Move to Top of Library <span className={styles.kbd}>L</span>
        </button>
      )}
      {currentZone !== 'library' && (
        <button className={styles.menuItem} onClick={() => { onMove('library-bottom'); onClose() }}>
          Move to Bottom of Library
        </button>
      )}

      {/* Stack actions -- lands never go through the stack. Battlefield cards only get
          triggered/activated, since they're not being "cast" again. */}
      {!isLand && (
        <>
          <div className={styles.menuDivider} />
          {!onBattlefield && (
            <button className={styles.menuItem} onClick={() => { onCastToStack('cast'); onClose() }}>
              Cast to Stack
            </button>
          )}
          <button className={styles.menuItem} onClick={() => { onCastToStack('triggered'); onClose() }}>
            Add Triggered Ability
          </button>
          <button className={styles.menuItem} onClick={() => { onCastToStack('activated'); onClose() }}>
            Add Activated Ability
          </button>
        </>
      )}

      {onBattlefield && onCreateTokenCopy && (
        <>
          <div className={styles.menuDivider} />
          <button className={styles.menuItem} onClick={() => { onCreateTokenCopy(); onClose() }}>
            Create Token Copy
          </button>
        </>
      )}

      <div className={styles.menuDivider} />
      <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { onRemove(); onClose() }}>
        Remove from Game
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}