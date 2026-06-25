'use client'

import { useState } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import styles from './ActionLog.module.css'

export function ActionLog() {
  const {
    logLines, editLogLine, removeLogLine, undoLastAction, scenarioStarted, startScenario,
    players, firstPlayerIndex, currentTurnPlayerIndex, turnNumber,
    setFirstPlayer, setCurrentTurnPlayer, setTurnNumber, passTurn,
  } = useBuilderStore()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditingText(logLines[index])
  }

  function commitEdit() {
    if (editingIndex !== null && editingText.trim()) {
      editLogLine(editingIndex, editingText.trim())
    }
    setEditingIndex(null)
  }

  const playerNames = players?.map(p => p.name) ?? ['Player', 'Opponent 1', 'Opponent 2', 'Opponent 3']
  const currentPlayer = players?.[currentTurnPlayerIndex]

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Action Log</span>
        {scenarioStarted && currentPlayer ? (
          <span className={styles.turnInfo}>T{turnNumber} — {currentPlayer.name}</span>
        ) : (
          <span className={styles.hint}>Click a line to edit</span>
        )}
      </div>

      <div className={styles.feed}>
        {!scenarioStarted ? (
          <div className={styles.notStarted}>
            <p className={styles.empty}>Set up the board state above, then configure the turn state before starting.</p>

            <div className={styles.turnSetup}>
              <label className={styles.turnLabel}>Who goes first?</label>
              <select
                className={styles.turnSelect}
                value={firstPlayerIndex}
                onChange={e => setFirstPlayer(Number(e.target.value))}
              >
                {playerNames.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>

              <label className={styles.turnLabel}>Whose turn is it?</label>
              <select
                className={styles.turnSelect}
                value={currentTurnPlayerIndex}
                onChange={e => setCurrentTurnPlayer(Number(e.target.value))}
              >
                {playerNames.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>

              <label className={styles.turnLabel}>Turn number</label>
              <input
                className={styles.turnNumberInput}
                type="number"
                min={1}
                value={turnNumber}
                onChange={e => setTurnNumber(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <button className={styles.startBtn} onClick={startScenario}>
              Start scenario
            </button>
          </div>
        ) : (
          <>
            {logLines.length === 0 && (
              <p className={styles.empty}>Actions will appear here as you build.</p>
            )}
            {logLines.map((line, i) => (
              <div key={i} className={styles.lineWrapper}>
                {editingIndex === i ? (
                  <input
                    className={styles.lineInput}
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') setEditingIndex(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span className={styles.line} onClick={() => startEdit(i)}>
                    {line}
                  </span>
                )}
                <button
                  className={styles.deleteLine}
                  onClick={() => removeLogLine(i)}
                  title="Delete line"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {scenarioStarted && (
        <div className={styles.actions}>
          <button className={styles.undoBtn} onClick={undoLastAction} title="Undo last action">
            Undo
          </button>
          <button className={styles.passTurnBtn} onClick={passTurn} title="Pass turn">
            Pass turn
          </button>
          <button
            className={styles.saveBtn}
            disabled={logLines.length === 0}
            title="Save current board state and log as a step"
          >
            Save step
          </button>
        </div>
      )}
    </div>
  )
}