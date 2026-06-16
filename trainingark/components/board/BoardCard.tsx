'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import type { Card } from '@/types/board'
import { CardContextMenu, type ZoneTarget, type StackType } from './CardContextMenu'
import styles from './BoardCard.module.css'

interface BoardCardProps {
  card: Card
  onMove: (target: ZoneTarget) => void
  onCastToStack: (type: StackType) => void
  isHovered?: boolean
  onHoverChange?: (hovered: boolean) => void
}

const CARD_BACK = '/back_magic.png'

export function BoardCard({ card, onMove, onCastToStack }: BoardCardProps) {
  const [hovered, setHovered] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const src = card.imageUrl ?? CARD_BACK

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

  // Keyboard shortcuts when hovered
  useEffect(() => {
    if (!hovered) return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case 'b': onMove('battlefield'); break
        case 'h': onMove('hand'); break
        case 'g': onMove('graveyard'); break
        case 'e': onMove('exile'); break
        case 'l': onMove('library-top'); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hovered, onMove])

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

        {/* 3-dot button top-left on hover */}
        {hovered && (
          <button className={styles.dotsBtn} onClick={handleDotsClick}>
            &#8942;
          </button>
        )}

        {/* Hover preview bottom-right of screen */}
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

      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          cardName={card.name}
          onMove={onMove}
          onCastToStack={onCastToStack}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}