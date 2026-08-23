import { describe, expect, it } from 'vitest'
import {
  canViewScenario,
  parseScenarioVisibility,
  PUBLIC_SCENARIO_WHERE,
  visibleScenarioWhere,
} from './scenarioVisibility'

describe('parseScenarioVisibility', () => {
  it.each(['DRAFT', 'UNLISTED', 'PUBLIC'] as const)('accepts %s', visibility => {
    expect(parseScenarioVisibility(visibility)).toBe(visibility)
  })

  it.each(['draft', 'published', '', null, undefined, true])('rejects %j', value => {
    expect(parseScenarioVisibility(value)).toBeNull()
  })
})

describe('canViewScenario', () => {
  it('keeps drafts private to their Arkitekt', () => {
    const draft = { visibility: 'DRAFT' as const, authorId: 'author-1' }

    expect(canViewScenario(draft)).toBe(false)
    expect(canViewScenario(draft, 'someone-else')).toBe(false)
    expect(canViewScenario(draft, 'author-1')).toBe(true)
  })

  it.each(['UNLISTED', 'PUBLIC'] as const)('allows link access to %s scenarios', visibility => {
    expect(canViewScenario({ visibility, authorId: 'author-1' })).toBe(true)
    expect(canViewScenario({ visibility, authorId: 'author-1' }, 'someone-else')).toBe(true)
  })
})

describe('discovery queries', () => {
  it('discovers only public scenarios for signed-out users', () => {
    expect(PUBLIC_SCENARIO_WHERE).toEqual({ visibility: 'PUBLIC' })
    expect(visibleScenarioWhere()).toEqual(PUBLIC_SCENARIO_WHERE)
  })

  it('does not leak creator-only scenarios into a signed-in home feed', () => {
    expect(visibleScenarioWhere('author-1')).toEqual(PUBLIC_SCENARIO_WHERE)
  })
})
