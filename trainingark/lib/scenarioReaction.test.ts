import { describe, expect, it } from 'vitest'
import {
  buildScenarioReactionSummary,
  optimisticReactionSummary,
  parseScenarioReaction,
} from './scenarioReaction'

describe('scenario reactions', () => {
  it('accepts only the two supported reactions', () => {
    expect(parseScenarioReaction('LIKE')).toBe('LIKE')
    expect(parseScenarioReaction('DISLIKE')).toBe('DISLIKE')
    expect(parseScenarioReaction('LOVE')).toBeNull()
    expect(parseScenarioReaction(null)).toBeNull()
  })

  it('fills missing aggregate groups with zero', () => {
    expect(buildScenarioReactionSummary([{ type: 'LIKE', count: 3 }], 'LIKE')).toEqual({
      likes: 3,
      dislikes: 0,
      reaction: 'LIKE',
    })
  })

  it('switches a reaction without changing the total number of reacting users', () => {
    expect(optimisticReactionSummary({ likes: 4, dislikes: 2, reaction: 'LIKE' }, 'DISLIKE')).toEqual({
      likes: 3,
      dislikes: 3,
      reaction: 'DISLIKE',
    })
  })

  it('removes an active reaction and never produces negative counts', () => {
    expect(optimisticReactionSummary({ likes: 0, dislikes: 0, reaction: 'LIKE' }, null)).toEqual({
      likes: 0,
      dislikes: 0,
      reaction: null,
    })
  })
})
