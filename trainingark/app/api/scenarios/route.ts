import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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