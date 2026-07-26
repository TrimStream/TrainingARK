import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  PUBLIC_SCENARIO_WHERE,
  SCENARIO_CARD_SELECT,
  withScenarioAuthor,
} from '@/lib/scenarioVisibility'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
// Long queries are pointless here and only make the sequential ILIKE scan worse.
const MAX_QUERY_LENGTH = 100

function parseLimit(raw: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT)
}

/**
 * Builds the ILIKE pattern. `%` and `_` are wildcards, so they are escaped
 * with the default backslash escape character — searching for "100%" looks for
 * a literal percent sign instead of matching every row.
 */
function likePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, match => `\\${match}`)
  return `%${escaped}%`
}

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams
    const query = (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH)
    const limit = parseLimit(params.get('limit'))

    // No query is not an error — /search with no ?q= renders a prompt state.
    if (!query) return NextResponse.json([])

    const pattern = likePattern(query)

    // Prisma cannot substring-match *inside* an element of a String[]:
    // `commanders: { has: q }` is whole-element equality. So this raw query
    // resolves matching ids only — EXISTS + unnest expands the array without
    // multiplying rows — and Prisma hydrates them below. Matching all three
    // fields with the same ILIKE keeps case and escaping behaviour identical
    // across them.
    //
    // `published = true` is repeated here so LIMIT cannot be filled by rows the
    // outer filter would then discard; PUBLIC_SCENARIO_WHERE stays the
    // authoritative visibility check.
    const matches = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT s."id"
      FROM "Scenario" s
      LEFT JOIN "User" u ON u."id" = s."authorId"
      WHERE s."published" = true
        AND (
          s."title" ILIKE ${pattern}
          OR u."name" ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM unnest(s."commanders") AS c WHERE c ILIKE ${pattern}
          )
        )
      ORDER BY s."updatedAt" DESC
      LIMIT ${limit}
    `)

    const ids = matches.map(m => m.id)
    if (ids.length === 0) return NextResponse.json([])

    const scenarios = await prisma.scenario.findMany({
      where: { AND: [PUBLIC_SCENARIO_WHERE, { id: { in: ids } }] },
      select: SCENARIO_CARD_SELECT,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(scenarios.map(withScenarioAuthor))
  } catch (err) {
    console.error('Search failed:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
