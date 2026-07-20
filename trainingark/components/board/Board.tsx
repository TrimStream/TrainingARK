'use client'

import { useBuilderStore } from '@/store/builderStore'
import type { Player, StackItem } from '@/types/board'
import { PlayerZone } from './PlayerZone'
import styles from './Board.module.css'

interface BoardProps {
  revealAll?: boolean
  // viewMode + snapshot: read-only rendering of a saved step for the scenario
  // viewer. The snapshot fully replaces store data so nothing leaks between
  // the builder session and the viewer.
  viewMode?: boolean
  snapshot?: {
    players: [Player, Player, Player, Player]
    stack: StackItem[]
  }
}

export function Board({ revealAll, viewMode, snapshot }: BoardProps) {
  const { stack: storeStack, resolveStack, removeFromStack, exileFromStack } = useBuilderStore()

  const stack = viewMode && snapshot ? snapshot.stack : storeStack

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <PlayerZone playerIndex={2} position="top-left" revealAll={viewMode ? undefined : revealAll} viewMode={viewMode} playerOverride={snapshot?.players[2]} />
        <PlayerZone playerIndex={3} position="top-right" revealAll={viewMode ? undefined : revealAll} viewMode={viewMode} playerOverride={snapshot?.players[3]} />
        <PlayerZone playerIndex={1} position="bottom-left" revealAll={viewMode ? undefined : revealAll} viewMode={viewMode} playerOverride={snapshot?.players[1]} />
        <PlayerZone playerIndex={0} position="bottom-right" revealAll={viewMode ? undefined : revealAll} viewMode={viewMode} playerOverride={snapshot?.players[0]} />

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
                {!viewMode && idx === 0 && (
                  <div className={styles.stackActions}>
                    <button onClick={() => resolveStack(item.id)} title="Resolve">✓</button>
                    <button onClick={() => removeFromStack(item.id)} title="Counter">✕</button>
                    {item.type === 'cast' && (
                      <button onClick={() => exileFromStack(item.id)} title="Exile">⊗</button>
                    )}
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