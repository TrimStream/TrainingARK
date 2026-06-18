'use client'

import { useBuilderStore } from '@/store/builderStore'
import { PlayerZone } from './PlayerZone'
import styles from './Board.module.css'

export function Board({ revealAll }: { revealAll?: boolean }) {
  const { stack, resolveStack, removeFromStack } = useBuilderStore()

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
            {[...stack].reverse().map((item, idx) => (
              <div key={item.id} className={styles.stackItem}>
                <span className={styles.stackType}>
                  {item.type === 'cast' ? '✦' : item.type === 'triggered' ? '⟳' : '⚡'}
                </span>
                <span className={styles.stackName}>{item.sourceCardName}</span>
                <span className={styles.stackController}>{item.controller}</span>
                {idx === 0 && (
                  <div className={styles.stackActions}>
                    <button onClick={() => resolveStack(item.id)} title="Resolve">✓</button>
                    <button onClick={() => removeFromStack(item.id)} title="Counter">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}