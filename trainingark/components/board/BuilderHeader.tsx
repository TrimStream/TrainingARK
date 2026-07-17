'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useBuilderStore } from '@/store/builderStore'
import styles from './BuilderHeader.module.css'

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export function BuilderHeader() {
  const {
    scenarioTitle, setScenarioTitle,
    scenarioDescription, setScenarioDescription,
    difficulty, setDifficulty,
    players,
  } = useBuilderStore()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  function commitTitle() {
    if (titleInput.trim()) setScenarioTitle(titleInput.trim())
    setEditingTitle(false)
  }

  // Featured commanders derived from command zones
  const commanders = players
    ? players.flatMap(p => p.zones.command.cards.map(c => c.name)).filter(Boolean)
    : []

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        {editingTitle ? (
          <input
            className={styles.titleInput}
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') setEditingTitle(false)
            }}
            autoFocus
          />
        ) : (
          <span
            className={styles.title}
            onClick={() => { setTitleInput(scenarioTitle); setEditingTitle(true) }}
            title="Click to edit title"
          >
            {scenarioTitle}
          </span>
        )}
        <span className={`${styles.difficultyBadge} ${styles[`badge_${difficulty}`]}`}>
          {DIFFICULTY_LABELS[difficulty]}
        </span>
      </div>

      <button className={styles.detailsBtn} onClick={() => setShowDetails(true)}>
        Details
      </button>

      {showDetails && createPortal(
        <div className={styles.detailsBackdrop} onClick={() => setShowDetails(false)}>
          <div className={styles.detailsModal} onClick={e => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <span className={styles.detailsTitle}>Scenario details</span>
              <button className={styles.detailsClose} onClick={() => setShowDetails(false)}>×</button>
            </div>

            <label className={styles.fieldLabel}>Title</label>
            <input
              className={styles.fieldInput}
              value={scenarioTitle}
              onChange={e => setScenarioTitle(e.target.value)}
            />

            <label className={styles.fieldLabel}>Description</label>
            <textarea
              className={styles.fieldTextarea}
              placeholder="What does this scenario teach? What situation is the player dropped into?"
              value={scenarioDescription}
              onChange={e => setScenarioDescription(e.target.value)}
              rows={4}
            />

            <label className={styles.fieldLabel}>Difficulty</label>
            <select
              className={styles.fieldSelect}
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <label className={styles.fieldLabel}>Featured commanders</label>
            {commanders.length === 0 ? (
              <p className={styles.commandersEmpty}>Set up players to populate commanders.</p>
            ) : (
              <div className={styles.commandersList}>
                {commanders.map((name, i) => (
                  <span key={i} className={styles.commanderChip}>{name}</span>
                ))}
              </div>
            )}

            <button className={styles.doneBtn} onClick={() => setShowDetails(false)}>
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}