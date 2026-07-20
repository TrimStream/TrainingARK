'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { Card } from '@/types/board'
import styles from './ViewerBoard.module.css'

const CARD_BACK = '/back_magic.png'

export function ViewerCard({ card, hidden, width = 66, height = 92 }: {
  card: Card
  hidden?: boolean
  width?: number
  height?: number
}) {
  const [hovered, setHovered] = useState(false)
  const src = hidden || !card.imageUrl ? CARD_BACK : card.imageUrl
  const showPreview = hovered && !hidden && card.imageUrl

  return (
    <div
      className={`${styles.card} ${card.tapped ? styles.tapped : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={src}
        alt={hidden ? 'Hidden card' : card.name}
        width={width}
        height={height}
        style={{ borderRadius: 4, display: 'block', width, height }}
      />
      {card.isToken && (card.stackCount ?? 1) > 1 && (
        <div className={styles.stackBadge}>×{card.stackCount}</div>
      )}
      {showPreview && createPortal(
        <div className={styles.preview}>
          <Image src={card.imageUrl!} alt={card.name} width={240} height={336} style={{ borderRadius: 8, display: 'block' }} />
        </div>,
        document.body
      )}
    </div>
  )
}