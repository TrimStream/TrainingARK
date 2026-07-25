'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBuilderStore } from '@/store/builderStore'
import { TarkLogo } from '@/components/shell/TarkLogo'
import { useAuth } from '@/lib/useAuth'
import styles from './BuilderHeader.module.css'

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

// Quiet period after the last change before an autosave fires.
const AUTOSAVE_DELAY_MS = 3000
// How long "Saved" stays on screen before the indicator goes quiet.
const SAVED_INDICATOR_MS = 2000

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ScenarioListItem {
  id: string
  title: string
  description: string
  difficulty: string
  updatedAt: string
  published: boolean
}

export function BuilderHeader() {
  const {
    scenarioTitle, setScenarioTitle,
    scenarioDescription, setScenarioDescription,
    difficulty, setDifficulty,
    players, steps, decklists,
    firstPlayerIndex, currentTurnPlayerIndex, turnNumber, handSizes,
    loadScenario, resetScenario,
    stack, logLines, lastSavedLogIndex, setupComplete, scenarioStarted,
  } = useBuilderStore()

  const router = useRouter()
  const { user } = useAuth()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [savedScenarioId, setSavedScenarioId] = useState<string | null>(null)
  const [scenarioAuthorId, setScenarioAuthorId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showLoad, setShowLoad] = useState(false)
  const [scenarioList, setScenarioList] = useState<ScenarioListItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(false)

  // One save-state for both the manual button and autosave, so the header
  // never shows two competing save indicators.
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs, not state: the debounced timer must always see current values.
  const scenarioIdRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const rerunRef = useRef(false)
  const mountedRef = useRef(false)
  const skipNextAutosaveRef = useRef(false)
  const lastSavedBodyRef = useRef<string | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const canSave = setupComplete.some(Boolean)
  const isOwner = !!savedScenarioId && !!user && scenarioAuthorId === user.id

  function buildPayload() {
    return {
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
  }

  function flashSaved() {
    setSaveState('saved')
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaveState('idle'), SAVED_INDICATOR_MS)
  }

  async function performSave({ silent }: { silent: boolean }) {
    // The builder is behind a server-side login gate, so a missing session
    // here is a genuine error rather than something to skip quietly.
    if (!user) {
      setSaveState('error')
      setSaveError('Not signed in — sign in again to save.')
      return
    }

    const body = JSON.stringify(buildPayload())

    // Autosave skips no-op writes (e.g. right after a manual save).
    if (silent && body === lastSavedBodyRef.current) return

    if (savingRef.current) {
      // A save is already in flight; queue one more pass afterwards so the
      // newest state still lands and we never double-POST a new scenario.
      rerunRef.current = true
      return
    }

    savingRef.current = true
    setSaveState('saving')
    setSaveError(null)

    try {
      const id = scenarioIdRef.current
      const res = await fetch(id ? `/api/scenarios/${id}` : '/api/scenarios', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()

      if (result.id) {
        scenarioIdRef.current = result.id
        setSavedScenarioId(result.id)
      }
      if (result.authorId !== undefined) setScenarioAuthorId(result.authorId)
      if (typeof result.published === 'boolean') setPublished(result.published)

      lastSavedBodyRef.current = body
      flashSaved()
    } catch (err) {
      console.error('Save failed:', err)
      setSaveState('error')
      setSaveError('Save failed')
    } finally {
      savingRef.current = false
      if (rerunRef.current) {
        rerunRef.current = false
        void saveRef.current({ silent: true })
      }
    }
  }

  // Always call the latest closure from timers and the retry path.
  const saveRef = useRef(performSave)
  saveRef.current = performSave

  // Debounced autosave. Starts only once the same gate that enables the
  // manual save button is met.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false
      return
    }
    if (!canSave) return

    const timer = setTimeout(() => { void saveRef.current({ silent: true }) }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [
    canSave,
    players, stack, steps, logLines, decklists,
    scenarioTitle, scenarioDescription, difficulty,
    firstPlayerIndex, currentTurnPlayerIndex, turnNumber, handSizes,
    setupComplete, scenarioStarted, lastSavedLogIndex,
  ])

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  async function handleTogglePublish() {
    if (!savedScenarioId || publishing) return
    setPublishing(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/scenarios/${savedScenarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      setPublished(!!result.published)
    } catch (err) {
      console.error('Publish toggle failed:', err)
      setSaveState('error')
      setSaveError('Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete() {
    if (!savedScenarioId || deleting) return
    const confirmed = window.confirm(
      `Delete "${scenarioTitle}" permanently? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/scenarios/${savedScenarioId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      skipNextAutosaveRef.current = true
      scenarioIdRef.current = null
      lastSavedBodyRef.current = null
      setSavedScenarioId(null)
      setScenarioAuthorId(null)
      setPublished(false)
      setSaveState('idle')
      setSaveError(null)
      resetScenario()
      router.replace('/builder')
      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
      setSaveState('error')
      setSaveError('Delete failed')
    } finally {
      setDeleting(false)
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
      // `mine=1` — the unfiltered list also contains other authors' published
      // scenarios, which you can't save over anyway.
      const res = await fetch('/api/scenarios?mine=1')
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

      // Loading rewrites most of the store; don't let that churn trigger an
      // immediate autosave of what we just read back.
      skipNextAutosaveRef.current = true
      loadScenario({
        title: scenario.title,
        description: scenario.description,
        difficulty: scenario.difficulty,
        data: scenario.data,
      })
      scenarioIdRef.current = scenario.id
      lastSavedBodyRef.current = null
      setSavedScenarioId(scenario.id)
      setScenarioAuthorId(scenario.authorId ?? null)
      setPublished(!!scenario.published)
      setSaveState('idle')
      setSaveError(null)
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
        <Link href="/" className={styles.homeLink} title="Back to home" aria-label="Back to TrainingARK home">
          <TarkLogo size="small" />
        </Link>
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
        {savedScenarioId && (
          <button
            className={`${styles.publishBtn} ${published ? styles.publishBtnLive : ''}`}
            onClick={handleTogglePublish}
            disabled={publishing}
            title={published
              ? 'Unpublish — hides it from everyone but you'
              : 'Publish — makes it visible to everyone'}
          >
            {publishing ? '...' : published ? 'Published' : 'Publish'}
          </button>
        )}
      </div>

      <div className={styles.right}>
        {saveState === 'saving' && <span className={styles.saveStatusPending}>Saving...</span>}
        {saveState === 'saved' && <span className={styles.saveStatusOk}>Saved</span>}
        {saveState === 'error' && (
          <span className={styles.saveStatusError}>{saveError ?? 'Save failed'}</span>
        )}
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
          onClick={() => { void performSave({ silent: false }) }}
          disabled={saveState === 'saving' || !canSave}
          title={!canSave ? 'Set up at least one player first' : 'Save scenario to database'}
        >
          {savedScenarioId ? 'Update scenario' : 'Save scenario'}
        </button>
        {isOwner && (
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={deleting}
            title="Delete this scenario permanently"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
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
                      {s.published ? 'Published' : 'Draft'} · {s.difficulty} · {new Date(s.updatedAt).toLocaleDateString()}
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
