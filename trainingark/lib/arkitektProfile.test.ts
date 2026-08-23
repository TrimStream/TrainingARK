import { describe, expect, it } from 'vitest'
import {
  arkitektDisplayName,
  FALLBACK_ARKITEKT_NAME,
  MAX_ARKITEKT_BIO_LENGTH,
  normalizeArkitektBio,
} from './arkitektProfile'

describe('Arkitekt public profiles', () => {
  it('never exposes email as the public display-name fallback', () => {
    expect(arkitektDisplayName(null)).toBe(FALLBACK_ARKITEKT_NAME)
    expect(arkitektDisplayName('   ')).toBe(FALLBACK_ARKITEKT_NAME)
    expect(arkitektDisplayName('  Tymna Pilot  ')).toBe('Tymna Pilot')
  })

  it('normalizes blank bios to null', () => {
    expect(normalizeArkitektBio('   ')).toEqual({ ok: true, value: null })
  })

  it('trims a valid public bio', () => {
    expect(normalizeArkitektBio('  I build stack-interaction puzzles.  ')).toEqual({
      ok: true,
      value: 'I build stack-interaction puzzles.',
    })
  })

  it('rejects non-text and oversized bios', () => {
    expect(normalizeArkitektBio(null)).toEqual({ ok: false, error: 'Bio must be text.' })
    expect(normalizeArkitektBio('x'.repeat(MAX_ARKITEKT_BIO_LENGTH + 1))).toEqual({
      ok: false,
      error: `Bio must be ${MAX_ARKITEKT_BIO_LENGTH} characters or fewer.`,
    })
  })
})
