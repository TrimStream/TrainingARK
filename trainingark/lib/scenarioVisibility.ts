import type { Prisma } from '@prisma/client'

// The single place scenario visibility is defined. Both the list endpoint and
// the search endpoint import from here so the rules can't drift apart.

/**
 * The public rule: only published scenarios. This is what an unauthenticated
 * visitor sees, and it is also what search is limited to — search never
 * surfaces drafts, not even your own.
 */
export const PUBLIC_SCENARIO_WHERE: Prisma.ScenarioWhereInput = { published: true }

/**
 * The home-feed rule: everyone sees published scenarios; a signed-in user
 * additionally sees their own drafts. Another author's drafts are never
 * returned.
 */
export function visibleScenarioWhere(userId?: string): Prisma.ScenarioWhereInput {
  if (!userId) return PUBLIC_SCENARIO_WHERE
  return { OR: [PUBLIC_SCENARIO_WHERE, { authorId: userId }] }
}

/** The `?mine=1` rule: this author's scenarios only, drafts included. */
export function ownScenarioWhere(userId: string): Prisma.ScenarioWhereInput {
  return { authorId: userId }
}

/**
 * The field set every scenario-card surface reads (home feed, dashboard,
 * search results). `author` is selected as a relation so the display name
 * comes back with the id attached — see toScenarioAuthor.
 */
export const SCENARIO_CARD_SELECT = {
  id: true,
  title: true,
  description: true,
  difficulty: true,
  commanders: true,
  createdAt: true,
  updatedAt: true,
  published: true,
  authorId: true,
  author: { select: { id: true, name: true } },
} satisfies Prisma.ScenarioSelect

/**
 * Author info as every consumer receives it. The id is always carried
 * alongside the name so an /author/<id> page can be linked later without
 * re-plumbing the API, even though nothing links to it today.
 */
export interface ScenarioAuthor {
  id: string
  name: string
}

/** Fallback when a User row has no name set. Matches useAuth()'s last resort. */
const FALLBACK_AUTHOR_NAME = 'Arkitekt'

/**
 * Normalizes the nullable `User.name` into a display name. Deliberately does
 * NOT fall back to the email local part the way lib/useAuth.ts does for the
 * signed-in user — these responses are public, and an email is not.
 */
export function toScenarioAuthor(
  author: { id: string; name: string | null } | null | undefined
): ScenarioAuthor | null {
  if (!author) return null
  return { id: author.id, name: author.name?.trim() || FALLBACK_AUTHOR_NAME }
}

/** Row shape produced by SCENARIO_CARD_SELECT, before the author is normalized. */
type ScenarioCardRow = Prisma.ScenarioGetPayload<{ select: typeof SCENARIO_CARD_SELECT }>

/** Applies toScenarioAuthor to a selected row so the API response is uniform. */
export function withScenarioAuthor(scenario: ScenarioCardRow) {
  return { ...scenario, author: toScenarioAuthor(scenario.author) }
}
