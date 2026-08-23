import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeReportDetails, parseCommentReportReason } from '@/lib/scenarioComment'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const reporterId = session?.user?.id
    if (!reporterId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const { id: commentId } = await params
    const comment = await prisma.scenarioComment.findUnique({ where: { id: commentId }, select: { userId: true, status: true } })
    if (!comment || comment.status !== 'ACTIVE') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (comment.userId === reporterId) return NextResponse.json({ error: 'You cannot report your own comment' }, { status: 400 })
    const body = await req.json()
    const reason = parseCommentReportReason(body?.reason)
    const details = normalizeReportDetails(body?.details)
    if (!reason || details === undefined) return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
    await prisma.commentReport.upsert({
      where: { commentId_reporterId: { commentId, reporterId } },
      create: { commentId, reporterId, reason, details },
      update: { reason, details, status: 'PENDING' },
    })
    return NextResponse.json({ reported: true })
  } catch (err) {
    console.error('Failed to report scenario comment:', err)
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 })
  }
}
