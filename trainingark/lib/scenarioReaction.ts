export const REACTION_TYPES = ['LIKE', 'DISLIKE'] as const
export type ScenarioReactionValue = (typeof REACTION_TYPES)[number]

export interface ScenarioReactionSummary {
  likes: number
  dislikes: number
  reaction: ScenarioReactionValue | null
}

export function parseScenarioReaction(input: unknown): ScenarioReactionValue | null {
  return typeof input === 'string' && REACTION_TYPES.includes(input as ScenarioReactionValue)
    ? input as ScenarioReactionValue
    : null
}

export function buildScenarioReactionSummary(
  groups: Array<{ type: ScenarioReactionValue; count: number }>,
  reaction: ScenarioReactionValue | null = null
): ScenarioReactionSummary {
  let likes = 0
  let dislikes = 0
  for (const group of groups) {
    if (group.type === 'LIKE') likes = group.count
    if (group.type === 'DISLIKE') dislikes = group.count
  }
  return { likes, dislikes, reaction }
}

export function optimisticReactionSummary(
  summary: ScenarioReactionSummary,
  next: ScenarioReactionValue | null
): ScenarioReactionSummary {
  let likes = summary.likes
  let dislikes = summary.dislikes
  if (summary.reaction === 'LIKE') likes = Math.max(0, likes - 1)
  if (summary.reaction === 'DISLIKE') dislikes = Math.max(0, dislikes - 1)
  if (next === 'LIKE') likes += 1
  if (next === 'DISLIKE') dislikes += 1
  return { likes, dislikes, reaction: next }
}
