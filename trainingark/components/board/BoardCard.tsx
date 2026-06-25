'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import type { Card } from '@/types/board'
import { CardContextMenu, type ZoneTarget, type StackType } from './CardContextMenu'
import styles from './BoardCard.module.css'
import type { EditableZone } from '@/store/builderStore'

interface BoardCardProps {
  card: Card
  onMove: (target: ZoneTarget) => void
  onCastToStack: (type: StackType) => void
  onRemove?: () => void
  onCreateTokenCopy?: () => void
  onToggleTapped?: () => void
  onIncrement?: () => void
  onDecrement?: () => void
  currentZone: EditableZone
  compact?: boolean
  showRemoveX?: boolean
}

const CARD_BACK = '/back_magic.png'

export function BoardCard({
  card, onMove, onCastToStack, onRemove, onCreateTokenCopy,
  onToggleTapped,
  onIncrement, onDecrement,
  currentZone, compact, showRemoveX,
}: BoardCardProps) {
  const [hovered, setHovered] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const src = card.imageUrl ?? CARD_BACK
  const isToken = card.isToken ?? false
  const stackCount = card.stackCount ?? 1

  function openContextMenu(x: number, y: number) {
    setContextMenu({ x, y })
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu(e.clientX, e.clientY)
  }

  function handleDotsClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) openContextMenu(rect.left, rect.top + 24)
  }

  useEffect(() => {
    if (compact || !hovered) return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case 'b': if (currentZone !== 'battlefield') onMove('battlefield'); break
        case 'h': if (currentZone !== 'hand') onMove('hand'); break
        case 'g': if (currentZone !== 'graveyard') onMove('graveyard'); break
        case 'e': if (currentZone !== 'exile') onMove('exile'); break
        case 'l': if (currentZone !== 'library') onMove('library-top'); break
        case 't': if (currentZone === 'battlefield') onToggleTapped?.(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hovered, onMove, compact])

  const contextMenuEl = contextMenu && (
    <CardContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      cardName={card.name}
      cardType={card.cardType}
      isToken={card.isToken}
      isCommander={card.isCommander}
      isTapped={card.tapped}
      onMove={onMove}
      onCastToStack={onCastToStack}
      onToggleTapped={onToggleTapped}
      onRemove={() => onRemove?.()}
      onCreateTokenCopy={onCreateTokenCopy}
      onClose={() => setContextMenu(null)}
      currentZone={currentZone}
    />
  )

  if (compact) {
    return (
      <>
        <div ref={cardRef} className={styles.compactWrap}>
          <button className={styles.compactDotsBtn} onClick={handleDotsClick} title="Card actions">
            &#8942;
          </button>
        </div>
        {contextMenuEl}
      </>
    )
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`${styles.card} ${card.tapped ? styles.tapped : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={handleContextMenu}
      >
        <Image
          src={src}
          alt={card.name}
          width={80}
          height={112}
          style={{ borderRadius: 4, display: 'block', width: 80, height: 112 }}
        />

        {hovered && (
          <button className={styles.dotsBtn} onClick={handleDotsClick}>
            &#8942;
          </button>
        )}

        {hovered && showRemoveX && onRemove && (
          <button
            className={styles.removeBtn}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
            title={isToken ? 'Remove all tokens' : 'Remove from game'}
          >
            ×
          </button>
        )}

        {isToken && stackCount > 1 && (
          <div className={styles.stackBadge}>×{stackCount}</div>
        )}

        {hovered && isToken && (onIncrement || onDecrement) && (
          <div className={styles.tokenControls}>
            <button
              className={styles.tokenBtn}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDecrement?.() }}
              title="Remove one"
            >
              −
            </button>
            <button
              className={styles.tokenBtn}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onIncrement?.() }}
              title="Add one"
            >
              +
            </button>
          </div>
        )}

        {hovered && card.imageUrl && createPortal(
          <div className={styles.preview}>
            <Image
              src={card.imageUrl}
              alt={card.name}
              width={240}
              height={336}
              style={{ borderRadius: 8, display: 'block' }}
            />
          </div>,
          document.body
        )}
      </div>

      {contextMenuEl}
    </>
  )
}