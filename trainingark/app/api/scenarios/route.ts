import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Hard cap on scenario payload size. A full 20-step scenario with snapshots
// is well under 2MB; anything past 8MB is abuse or a bug, not a scenario.
const MAX_PAYLOAD_BYTES = 8_000_000

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data } = body

    if (!title || !data) {
      return NextResponse.json({ error: 'Missing title or data' }, { status: 400 })
    }

    const scenario = await prisma.scenario.create({
      data: {
        title,
        description: description ?? '',
        difficulty: difficulty ?? 'beginner',
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