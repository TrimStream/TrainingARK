import type { Player, StackItem } from '@/types/board'

export interface ViewerDecisionChoice {
  id: string
  label: string
  quality: 'best' | 'ok' | 'blunder'
  explanation: string
}

export interface ViewerDecisionPoint {
  prompt: string
  choices: ViewerDecisionChoice[]
}

export interface ViewerStep {
  id: string
  label: string
  logLines: string[]
  boardState: {
    players: [Player, Player, Player, Player]
    stack: StackItem[]
  }
  decisionPoint?: ViewerDecisionPoint
}

export interface ViewerScenario {
  id: string
  title: string
  description: string
  difficulty: string
  data: {
    steps: ViewerStep[]
    commanders?: string[]
  }
}

export interface DecisionResult {
  stepLabel: string
  prompt: string
  pickedLabel: string
  pickedQuality: 'best' | 'ok' | 'blunder'
  bestLabel: string
  points: number
}

export const QUALITY_POINTS = { best: 2, ok: 1, blunder: 0 } as const