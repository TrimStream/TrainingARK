'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ViewerBoard } from './ViewerBoard'
import type { ViewerScenario, ViewerStep, ViewerDecisionChoice, DecisionResult } from './viewerTypes'
import { QUALITY_POINTS } from './viewerTypes'
import styles from './ScenarioViewer.module.css'

type Phase = 'loading' | 'error' | 'intro' | 'playing' | 'deciding' | 'revealed' | 'complete'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
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

  useEffect(() => {
    fetch(`/api/scenarios/${scenarioId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((s: ViewerScenario) => {
        if (!s.data?.steps?.length) throw new Error('Scenario has no steps')
        setScenario(s)
        setPhase('intro')
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

  function handleStart() {
    setVisibleLog([])
    setResults([])
    enterStep(0)
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
    setStepIndex(0)
    setVisibleLog([])
    setResults([])
    setPickedChoice(null)
    setPhase('intro')
  }

  if (phase === 'loading') {
    return <div className={styles.centerScreen}><span className={styles.loadingText}>Loading scenario...</span></div>
  }

  if (phase === 'error' || !scenario) {
    return <div className={styles.centerScreen}><span className={styles.errorText}>Could not load this scenario.</span></div>
  }

  if (phase === 'intro') {
    return (
      <div className={styles.centerScreen}>
        <div className={styles.introCard}>
          <span className={`${styles.difficultyBadge} ${styles[`badge_${scenario.difficulty}`]}`}>
            {scenario.difficulty}
          </span>
          <h1 className={styles.introTitle}>{scenario.title}</h1>
          {scenario.description && <p className={styles.introDesc}>{scenario.description}</p>}
          {scenario.data.commanders && scenario.data.commanders.length > 0 && (
            <div className={styles.introCommanders}>
              {scenario.data.commanders.map((name, i) => (
                <span key={i} className={styles.commanderChip}>{name}</span>
              ))}
            </div>
          )}
          <p className={styles.introMeta}>
            {steps.length} step{steps.length !== 1 ? 's' : ''} · {decisionCount} decision{decisionCount !== 1 ? 's' : ''} · {maxScore} points possible
          </p>
          <p className={styles.introHint}>
            You are in the bottom-right seat. Opponents' hands are hidden. Click graveyard, exile, and hand labels to inspect zones. Hover any card to read it.
          </p>
          <button className={styles.primaryBtn} onClick={handleStart}>Begin</button>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div className={styles.centerScreen}>
        <div className={styles.introCard}>
          <h1 className={styles.introTitle}>Scenario complete</h1>
          <div className={styles.scoreBig}>
            {score} / {maxScore}
          </div>
          <p className={styles.introMeta}>
            {perfectCount} of {decisionCount} decisions perfect
          </p>

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

          <button className={styles.primaryBtn} onClick={handleRestart}>Play again</button>
        </div>
      </div>
    )
  }

  // playing / deciding / revealed — board plus side panel
  const dp = currentStep?.decisionPoint

  return (
    <main className={styles.main}>
      <div className={styles.boardArea}>
        <div className={styles.viewerHeader}>
          <span className={styles.viewerTitle}>{scenario.title}</span>
          <span className={styles.viewerProgress}>
            Step {stepIndex + 1} / {steps.length}
            {decisionCount > 0 && <> · Score {score}/{maxScore}</>}
          </span>
        </div>
        <div className={styles.boardWrap}>
          {currentStep && (
            <ViewerBoard
              players={currentStep.boardState.players}
              stack={currentStep.boardState.stack}
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