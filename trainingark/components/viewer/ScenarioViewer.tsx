'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Board } from '@/components/board/Board'
import { TarkLogo } from '@/components/shell/TarkLogo'
import { useAuth } from '@/lib/useAuth'
import { ScenarioSaveControls } from '@/components/scenarios/ScenarioSaveControls'
import { ScenarioReactions } from '@/components/scenarios/ScenarioReactions'
import { ScenarioComments } from '@/components/scenarios/ScenarioComments'
import type { ViewerScenario, ViewerStep, ViewerDecisionChoice, DecisionResult } from './viewerTypes'
import { QUALITY_POINTS } from './viewerTypes'
import styles from './ScenarioViewer.module.css'

type Phase = 'loading' | 'error' | 'playing' | 'deciding' | 'revealed' | 'complete'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const SEAT_HINT = 'You are in the bottom-right seat. Opponents\u2019 hands are hidden.'

function HomeLink() {
  return (
    <Link href="/" className={styles.homeLink} aria-label="Back to TrainingARK home" title="Back to home">
      <TarkLogo size="small" />
    </Link>
  )
}

export function ScenarioViewer({ scenarioId }: { scenarioId: string }) {
  const [scenario, setScenario] = useState<ViewerScenario | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [stepIndex, setStepIndex] = useState(0)
  const [visibleLog, setVisibleLog] = useState<string[]>([])
  const [pickedChoice, setPickedChoice] = useState<ViewerDecisionChoice | null>(null)
  const [results, setResults] = useState<DecisionResult[]>([])
  const [shuffledChoices, setShuffledChoices] = useState<ViewerDecisionChoice[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  const { user, loading: authLoading } = useAuth()
  // useAuth() builds a fresh object each render, so effects key off the id.
  const userId = user?.id
  const [best, setBest] = useState<{ score: number; maxScore: number } | null>(null)
  // One write per completed playthrough. Reset by "Play again" so the next
  // completion records its own row.
  const attemptRecordedRef = useRef(false)

  useEffect(() => {
    fetch(`/api/scenarios/${scenarioId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((s: ViewerScenario) => {
        if (!s.data?.steps?.length) throw new Error('Scenario has no steps')
        setScenario(s)
        const first = s.data.steps[0]
        setStepIndex(0)
        setVisibleLog([SEAT_HINT, ...first.logLines])
        if (first.decisionPoint) {
          setShuffledChoices(shuffle(first.decisionPoint.choices))
          setPickedChoice(null)
          setPhase('deciding')
        } else {
          setPhase('playing')
        }
      })
      .catch(err => {
        console.error('Failed to load scenario:', err)
        setPhase('error')
      })
  }, [scenarioId])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleLog])

  const steps: ViewerStep[] = useMemo(() => scenario?.data.steps ?? [], [scenario])
  const currentStep = steps[stepIndex]
  const decisionCount = useMemo(() => steps.filter(s => s.decisionPoint).length, [steps])
  const maxScore = decisionCount * 2
  const score = results.reduce((sum, r) => sum + r.points, 0)
  const perfectCount = results.filter(r => r.points === 2).length

  // Your best previous run at this scenario, read once on load. Signed-out
  // visitors never fetch and never see it.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    fetch(`/api/attempts?scenarioId=${encodeURIComponent(scenarioId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((rows: { score: number; maxScore: number }[]) => {
        if (cancelled || rows.length === 0) return
        setBest(rows.reduce((top, r) => (r.score > top.score ? r : top)))
      })
      .catch(err => console.error('Could not load your best score:', err))

    return () => { cancelled = true }
  }, [userId, scenarioId])

  // Record the playthrough once it is finished. The ref is set before the
  // request so a re-render — or StrictMode's double invoke — cannot double
  // write. Anonymous play is simply not tracked; nothing is surfaced.
  useEffect(() => {
    if (phase !== 'complete' || authLoading) return
    if (attemptRecordedRef.current) return
    attemptRecordedRef.current = true
    if (!userId) return

    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, score, maxScore }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((body: { recorded: boolean }) => {
        // recorded === false means history is paused, which is not a failure.
        if (!body.recorded) return
        setBest(prev => (prev && prev.score >= score ? prev : { score, maxScore }))
      })
      .catch(err => console.error('Could not save this attempt:', err))
  }, [phase, authLoading, userId, scenarioId, score, maxScore])

  function enterStep(index: number) {
    const step = steps[index]
    if (!step) {
      setPhase('complete')
      return
    }
    setStepIndex(index)
    setVisibleLog(prev => [...prev, ...step.logLines])
    if (step.decisionPoint) {
      setShuffledChoices(shuffle(step.decisionPoint.choices))
      setPickedChoice(null)
      setPhase('deciding')
    } else {
      setPhase('playing')
    }
  }

  function handleNext() {
    if (stepIndex + 1 >= steps.length) {
      setPhase('complete')
    } else {
      enterStep(stepIndex + 1)
    }
  }

  function handlePick(choice: ViewerDecisionChoice) {
    if (phase !== 'deciding' || !currentStep?.decisionPoint) return
    const dp = currentStep.decisionPoint
    const best = dp.choices.find(c => c.quality === 'best')
    setPickedChoice(choice)
    setResults(prev => [...prev, {
      stepLabel: currentStep.label,
      prompt: dp.prompt,
      pickedLabel: choice.label,
      pickedQuality: choice.quality,
      bestLabel: best?.label ?? '',
      points: QUALITY_POINTS[choice.quality],
    }])
    setPhase('revealed')
  }

  function handleRestart() {
    // A replay is a new playthrough, so it gets to record its own attempt.
    attemptRecordedRef.current = false
    setResults([])
    setPickedChoice(null)
    const first = steps[0]
    if (!first) return
    setStepIndex(0)
    setVisibleLog([SEAT_HINT, ...first.logLines])
    if (first.decisionPoint) {
      setShuffledChoices(shuffle(first.decisionPoint.choices))
      setPhase('deciding')
    } else {
      setPhase('playing')
    }
  }

  if (phase === 'loading') {
    return (
      <div className={styles.centerScreen}>
        <HomeLink />
        <span className={styles.loadingText}>Loading scenario...</span>
      </div>
    )
  }

  if (phase === 'error' || !scenario) {
    return (
      <div className={styles.centerScreen}>
        <HomeLink />
        <span className={styles.errorText}>Could not load this scenario.</span>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className={styles.centerScreen}>
        <HomeLink />
        <div className={styles.introCard}>
          <h1 className={styles.introTitle}>{scenario.title}</h1>
          <div className={styles.scoreBig}>
            {score} / {maxScore}
          </div>
          <p className={styles.introMeta}>
            {perfectCount} of {decisionCount} decisions perfect
          </p>
          <ScenarioReactions scenarioId={scenarioId} />
          <ScenarioComments scenarioId={scenarioId} />

          {results.length > 0 && (
            <div className={styles.debrief}>
              {results.map((r, i) => (
                <div key={i} className={styles.debriefRow}>
                  <span className={`${styles.qualityBadge} ${styles[`quality_${r.pickedQuality}`]}`}>
                    {r.pickedQuality}
                  </span>
                  <div className={styles.debriefBody}>
                    <span className={styles.debriefPrompt}>{r.prompt}</span>
                    <span className={styles.debriefPick}>
                      You: {r.pickedLabel}
                      {r.pickedQuality !== 'best' && <> · Best: {r.bestLabel}</>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.completeActions}>
            <button className={styles.primaryBtn} onClick={handleRestart}>Play again</button>
            <Link href="/" className={styles.secondaryBtn}>Back to home</Link>
          </div>
        </div>
      </div>
    )
  }

  const dp = currentStep?.decisionPoint

  return (
    <main className={styles.main}>
      <div className={styles.boardArea}>
        <div className={styles.viewerHeader}>
          <div className={styles.viewerHeaderLeft}>
            <HomeLink />
            <span className={styles.viewerTitle}>{scenario.title}</span>
          </div>
          <div className={styles.viewerHeaderRight}>
            <span className={styles.viewerProgress}>
              Step {stepIndex + 1} / {steps.length}
              {decisionCount > 0 && <> · Score {score}/{maxScore}</>}
              {best && <> · Best {best.score}/{best.maxScore}</>}
            </span>
            <ScenarioReactions scenarioId={scenarioId} />
            <ScenarioComments scenarioId={scenarioId} />
            <ScenarioSaveControls scenarioId={scenarioId} variant="header" />
          </div>
        </div>
        <div className={styles.boardWrap}>
          {currentStep && (
            <Board
              viewMode
              snapshot={{
                players: currentStep.boardState.players,
                stack: currentStep.boardState.stack,
              }}
            />
          )}
        </div>
      </div>

      <div className={styles.sidePanel}>
        <div className={styles.logHeader}>Game log</div>
        <div className={styles.logFeed}>
          {visibleLog.map((line, i) => (
            <span key={i} className={styles.logLine}>{line}</span>
          ))}
          <div ref={logEndRef} />
        </div>

        <div className={styles.actionArea}>
          {phase === 'playing' && (
            <button className={styles.primaryBtn} onClick={handleNext}>
              {stepIndex + 1 >= steps.length ? 'Finish' : 'Next'}
            </button>
          )}

          {phase === 'deciding' && dp && (
            <div className={styles.decisionBox}>
              <span className={styles.decisionPrompt}>{dp.prompt}</span>
              <div className={styles.choiceList}>
                {shuffledChoices.map(choice => (
                  <button
                    key={choice.id}
                    className={styles.choiceBtn}
                    onClick={() => handlePick(choice)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'revealed' && dp && pickedChoice && (
            <div className={styles.decisionBox}>
              <div className={styles.revealHeader}>
                <span className={`${styles.qualityBadge} ${styles[`quality_${pickedChoice.quality}`]}`}>
                  {pickedChoice.quality}
                </span>
                <span className={styles.revealPoints}>+{QUALITY_POINTS[pickedChoice.quality]} pts</span>
              </div>
              <span className={styles.revealPicked}>{pickedChoice.label}</span>
              <p className={styles.revealExplanation}>{pickedChoice.explanation}</p>

              {pickedChoice.quality !== 'best' && (() => {
                const best = dp.choices.find(c => c.quality === 'best')
                return best ? (
                  <div className={styles.bestBox}>
                    <span className={styles.bestLabel}>Best line: {best.label}</span>
                    <p className={styles.bestExplanation}>{best.explanation}</p>
                  </div>
                ) : null
              })()}

              <button className={styles.primaryBtn} onClick={handleNext}>
                {stepIndex + 1 >= steps.length ? 'Finish' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
