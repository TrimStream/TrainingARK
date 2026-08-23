export const MAX_ARKITEKT_BIO_LENGTH = 300
export const FALLBACK_ARKITEKT_NAME = 'Arkitekt'

export function arkitektDisplayName(name: string | null | undefined): string {
  return name?.trim() || FALLBACK_ARKITEKT_NAME
}

export type ArkitektBioResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string }

export function normalizeArkitektBio(input: unknown): ArkitektBioResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Bio must be text.' }
  }

  const bio = input.trim()
  if (bio.length > MAX_ARKITEKT_BIO_LENGTH) {
    return {
      ok: false,
      error: `Bio must be ${MAX_ARKITEKT_BIO_LENGTH} characters or fewer.`,
    }
  }

  return { ok: true, value: bio || null }
}
