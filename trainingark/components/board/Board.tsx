'use client'

import type { StackItem } from '@/types/board'
import { PlayerZone } from './PlayerZone'
import styles from './Board.module.css'

interface BoardProps {
  stack?: StackItem[]
  revealAll?: boolean
}

export function Board({ stack = [], revealAll }: BoardProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <PlayerZone playerIndex={2} position="top-left" revealAll={revealAll} />
        <PlayerZone playerIndex={3} position="top-right" revealAll={revealAll} />
        <PlayerZone playerIndex={1} position="bottom-left" revealAll={revealAll} />
        <PlayerZone playerIndex={0} position="bottom-right" revealAll={revealAll} />

        {stack.length > 0 && (
          <div className={styles.stackZone}>
            <div className={styles.stackLabel}>Stack ({stack.length})</div>
            {[...stack].reverse().map(item => (
              <div key={item.id} className={styles.stackItem}>
                {item.sourceCardName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}