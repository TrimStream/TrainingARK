'use client'

import { useState } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import styles from './ActionLog.module.css'

export function ActionLog() {
  const { logLines, editLogLine, removeLogLine, undoLastAction, scenarioStarted, startScenario } = useBuilderStore()
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

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Action Log</span>
        <span className={styles.hint}>Click a line to edit</span>
      </div>

      <div className={styles.feed}>
        {!scenarioStarted ? (
          <div className={styles.notStarted}>
            <p className={styles.empty}>Set up the starting board state above, then start the scenario when ready.</p>
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
                  <span
                    className={styles.line}
                    onClick={() => startEdit(i)}
                  >
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
          <button
            className={styles.undoBtn}
            onClick={undoLastAction}
            title="Undo last action"
          >
            Undo
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