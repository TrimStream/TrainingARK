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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scenario = await prisma.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(scenario)
  } catch (err) {
    console.error('Failed to fetch scenario:', err)
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const raw = await req.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)
    const { title, description, difficulty, data, commanders } = body

    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(difficulty !== undefined && { difficulty }),
        ...(commanders !== undefined && { commanders: sanitizeCommanders(commanders) }),
        ...(data !== undefined && { data }),
      },
    })

    return NextResponse.json({ id: scenario.id })
  } catch (err) {
    console.error('Failed to update scenario:', err)
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
  }
}