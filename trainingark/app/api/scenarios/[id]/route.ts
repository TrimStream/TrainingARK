import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const body = await req.json()
    const { title, description, difficulty, data } = body

    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(difficulty !== undefined && { difficulty }),
        ...(data !== undefined && { data }),
      },
    })

    return NextResponse.json({ id: scenario.id })
  } catch (err) {
    console.error('Failed to update scenario:', err)
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
  }
}