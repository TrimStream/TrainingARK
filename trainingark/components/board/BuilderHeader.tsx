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

interface ScenarioListItem {
  id: string
  title: string
  description: string
  difficulty: string
  updatedAt: string
}

export function BuilderHeader() {
  const {
    scenarioTitle, setScenarioTitle,
    scenarioDescription, setScenarioDescription,
    difficulty, setDifficulty,
    players, steps, decklists,
    firstPlayerIndex, currentTurnPlayerIndex, turnNumber, handSizes,
    loadScenario,
    stack, logLines, lastSavedLogIndex, setupComplete, scenarioStarted,
  } = useBuilderStore()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedScenarioId, setSavedScenarioId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showLoad, setShowLoad] = useState(false)
  const [scenarioList, setScenarioList] = useState<ScenarioListItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(false)

  function commitTitle() {
    if (titleInput.trim()) setScenarioTitle(titleInput.trim())
    setEditingTitle(false)
  }

  // Commanders found wherever they currently sit, via the isCommander flag —
  // not just the command zone, so cast/moved commanders still count.
  const commanders = players
    ? players.flatMap(p =>
        Object.values(p.zones).flatMap(z => z.cards)
          .filter(c => c.isCommander)
          .map(c => c.name)
      ).filter(Boolean)
    : []

  const canPreview = !!savedScenarioId && steps.length > 0

  async function handleSaveScenario() {
    if (saving) return
    setSaving(true)
    setSaveStatus('idle')

    const payload = {
      title: scenarioTitle,
      description: scenarioDescription,
      difficulty,
      commanders,
      data: {
        steps,
        decklists,
        firstPlayerIndex,
        currentTurnPlayerIndex,
        turnNumber,
        handSizes,
        commanders,
        workingState: {
          players,
          stack,
          logLines,
          lastSavedLogIndex,
          setupComplete,
          scenarioStarted,
        },
      },
    }

    try {
      const url = savedScenarioId ? `/api/scenarios/${savedScenarioId}` : '/api/scenarios'
      const method = savedScenarioId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      if (result.id) setSavedScenarioId(result.id)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  function handlePreview() {
    if (!canPreview || !savedScenarioId) return
    window.open(`/scenario/${savedScenarioId}`, '_blank')
  }

  async function openLoadModal() {
    setShowLoad(true)
    setLoadingList(true)
    try {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list = await res.json()
      setScenarioList(list)
    } catch (err) {
      console.error('Failed to load scenario list:', err)
      setScenarioList([])
    } finally {
      setLoadingList(false)
    }
  }

  async function handleLoadScenario(id: string) {
    if (loadingScenario) return
    setLoadingScenario(true)
    try {
      const res = await fetch(`/api/scenarios/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const scenario = await res.json()
      loadScenario({
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty,
        data: scenario.data,
      })
      setSavedScenarioId(scenario.id)
      setShowLoad(false)
    } catch (err) {
      console.error('Failed to load scenario:', err)
    } finally {
      setLoadingScenario(false)
    }
  }

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

      <div className={styles.right}>
        {saveStatus === 'saved' && <span className={styles.saveStatusOk}>Saved</span>}
        {saveStatus === 'error' && <span className={styles.saveStatusError}>Save failed</span>}
        <button className={styles.detailsBtn} onClick={openLoadModal}>
          Load
        </button>
        <button
          className={styles.detailsBtn}
          onClick={handlePreview}
          disabled={!canPreview}
          title={!savedScenarioId
            ? 'Save the scenario first'
            : steps.length === 0
              ? 'Save at least one step first'
              : 'Play this scenario as a player (opens in a new tab)'}
        >
          Preview
        </button>
        <button
          className={styles.saveScenarioBtn}
          onClick={handleSaveScenario}
          disabled={saving || !setupComplete.some(Boolean)}
          title={!setupComplete.some(Boolean) ? 'Set up at least one player first' : 'Save scenario to database'}
        >
          {saving ? 'Saving...' : savedScenarioId ? 'Update scenario' : 'Save scenario'}
        </button>
        <button className={styles.detailsBtn} onClick={() => setShowDetails(true)}>
          Details
        </button>
      </div>

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

      {showLoad && createPortal(
        <div className={styles.detailsBackdrop} onClick={() => setShowLoad(false)}>
          <div className={styles.detailsModal} onClick={e => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <span className={styles.detailsTitle}>Load scenario</span>
              <button className={styles.detailsClose} onClick={() => setShowLoad(false)}>×</button>
            </div>

            <p className={styles.loadWarning}>
              Loading replaces everything currently in the builder. Save first if you want to keep your work.
            </p>

            {loadingList ? (
              <p className={styles.commandersEmpty}>Loading...</p>
            ) : scenarioList.length === 0 ? (
              <p className={styles.commandersEmpty}>No saved scenarios.</p>
            ) : (
              <div className={styles.loadList}>
                {scenarioList.map(s => (
                  <button
                    key={s.id}
                    className={styles.loadRow}
                    onClick={() => handleLoadScenario(s.id)}
                    disabled={loadingScenario}
                  >
                    <span className={styles.loadRowTitle}>{s.title}</span>
                    <span className={styles.loadRowMeta}>
                      {s.difficulty} · {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}