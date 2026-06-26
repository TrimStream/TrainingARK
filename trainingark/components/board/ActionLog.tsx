'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useBuilderStore } from '@/store/builderStore'
import styles from './ActionLog.module.css'

export function ActionLog() {
  const {
    logLines, editLogLine, removeLogLine, undoLastAction, scenarioStarted, startScenario,
    players, firstPlayerIndex, currentTurnPlayerIndex, turnNumber, handSizes,
    setFirstPlayer, setCurrentTurnPlayer, setTurnNumber, passTurn, moveCard,
  } = useBuilderStore()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [showDiscardModal, setShowDiscardModal] = useState(false)

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

  function handlePassTurn() {
    if (!players) return
    const currentPlayer = players[currentTurnPlayerIndex]
    const handCount = currentPlayer.zones.hand.cardCount ?? currentPlayer.zones.hand.cards.length
    const handSize = handSizes[currentTurnPlayerIndex]

    if (handCount > handSize && currentPlayer.zones.hand.cards.length > 0) {
      setShowDiscardModal(true)
    } else {
      passTurn()
    }
  }

  function handleDiscardCard(cardId: string) {
    if (!players) return
    moveCard(currentTurnPlayerIndex, cardId, 'hand', 'graveyard')
  }

  function handleDiscardDone() {
    setShowDiscardModal(false)
    passTurn()
  }

  const playerNames = players?.map(p => p.name) ?? ['Player', 'Opponent 1', 'Opponent 2', 'Opponent 3']
  const currentPlayer = players?.[currentTurnPlayerIndex]
  const currentHandSize = handSizes[currentTurnPlayerIndex]
  const currentHandCount = currentPlayer
    ? (currentPlayer.zones.hand.cardCount ?? currentPlayer.zones.hand.cards.length)
    : 0
  const discardCount = Math.max(0, currentHandCount - currentHandSize)

  const discardModal = showDiscardModal && currentPlayer && createPortal(
    <div className={styles.discardBackdrop} onClick={e => e.stopPropagation()}>
      <div className={styles.discardModal}>
        <div className={styles.discardHeader}>
          <span className={styles.discardTitle}>
            {discardCount > 0
              ? `${currentPlayer.name} must discard ${discardCount} card${discardCount > 1 ? 's' : ''}`
              : `${currentPlayer.name} is at hand size`}
          </span>
        </div>

        <div className={styles.discardGrid}>
          {currentPlayer.zones.hand.cards.length === 0 ? (
            <p className={styles.discardEmpty}>No cards to discard.</p>
          ) : (
            currentPlayer.zones.hand.cards.map(card => (
              <div
                key={card.id}
                className={`${styles.discardCard} ${discardCount <= 0 ? styles.discardCardDone : ''}`}
                onClick={() => { if (discardCount > 0) handleDiscardCard(card.id) }}
                title={discardCount > 0 ? `Discard ${card.name}` : ''}
              >
                <Image
                  src={card.imageUrl ?? '/back_magic.png'}
                  alt={card.name}
                  width={80}
                  height={112}
                  style={{ borderRadius: 4, display: 'block' }}
                />
                <div className={styles.discardCardOverlay}>
                  <span className={styles.discardCardName}>{card.name}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.discardActions}>
          <button className={styles.discardSkipBtn} onClick={handleDiscardDone}>
            Skip cleanup
          </button>
          <button
            className={styles.discardDoneBtn}
            onClick={handleDiscardDone}
            disabled={discardCount > 0}
          >
            {discardCount > 0 ? `Discard ${discardCount} more` : 'Done'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

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
          <button className={styles.passTurnBtn} onClick={handlePassTurn} title="Pass turn">
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

      {discardModal}
    </div>
  )
}