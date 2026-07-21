import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX_PAYLOAD_BYTES = 8_000_000
const MAX_COMMANDERS = 8

function sanitizeCommanders(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .slice(0, MAX_COMMANDERS)
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data, commanders } = body

    if (!title || !data) {
      return NextResponse.json({ error: 'Missing title or data' }, { status: 400 })
    }

    const scenario = await prisma.scenario.create({
      data: {
        title,
        description: description ?? '',
        difficulty: difficulty ?? 'beginner',
        commanders: sanitizeCommanders(commanders),
        data,
      },
    })

    return NextResponse.json({ id: scenario.id }, { status: 201 })
  } catch (err) {
    console.error('Failed to create scenario:', err)
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        commanders: true,
        createdAt: true,
        updatedAt: true,
        published: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(scenarios)
  } catch (err) {
    console.error('Failed to list scenarios:', err)
    return NextResponse.json({ error: 'Failed to list scenarios' }, { status: 500 })
  }
}