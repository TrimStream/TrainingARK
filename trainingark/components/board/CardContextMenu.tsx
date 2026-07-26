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
  | 'command'

export type StackType = 'cast' | 'triggered' | 'activated'

interface CardContextMenuProps {
  x: number
  y: number
  cardName: string
  cardType: Card['cardType']
  isToken?: boolean
  isCommander?: boolean
  isTapped?: boolean
  isRevealed?: boolean
  onMove: (target: ZoneTarget) => void
  onCastToStack: (type: StackType) => void
  onToggleTapped?: () => void
  // Only supplied for opponent seats — the player's own cards are always
  // visible to the viewer, so there is nothing to reveal.
  onToggleRevealed?: () => void
  onRemove: () => void
  onCreateTokenCopy?: () => void
  onClose: () => void
  currentZone: EditableZone
}

export function CardContextMenu({
  x, y, cardName, cardType, isToken, isCommander, isTapped, isRevealed,
  onMove, onCastToStack, onToggleTapped, onToggleRevealed, onRemove, onCreateTokenCopy, onClose, currentZone,
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
  const menuHeight = 360
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y

  const isLand = cardType === 'land'
  const onBattlefield = currentZone === 'battlefield'

  const menu = (
    <div ref={ref} className={styles.menu} style={{ left: adjustedX, top: adjustedY }}>
      <div className={styles.menuHeader}>{cardName}</div>
      <div className={styles.menuDivider} />

      {onBattlefield && onToggleTapped && (
        <>
          <button className={styles.menuItem} onClick={() => { onToggleTapped(); onClose() }}>
            {isTapped ? 'Untap' : 'Tap'} <span className={styles.kbd}>T</span>
          </button>
          <div className={styles.menuDivider} />
        </>
      )}

      {onToggleRevealed && (
        <>
          <button className={styles.menuItem} onClick={() => { onToggleRevealed(); onClose() }}>
            {isRevealed ? 'Hide from Viewer' : 'Reveal to Viewer'} <span className={styles.kbd}>R</span>
          </button>
          <div className={styles.menuDivider} />
        </>
      )}

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
      {isCommander && currentZone !== 'command' && (
        <button className={styles.menuItem} onClick={() => { onMove('command'); onClose() }}>
          Move to Command Zone
        </button>
      )}

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