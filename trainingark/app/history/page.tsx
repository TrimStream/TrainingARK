import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HistoryClient } from '@/components/history/HistoryClient'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'History' }

export default async function HistoryPage() {
  // Server-side gate, same as the dashboard, settings and the builder.
  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent('/history')}`)

  // Seeded from the database rather than fetched on the client so the pause
  // switch paints in the correct position instead of flipping a moment later.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { historyEnabled: true },
  })

  return <HistoryClient initialHistoryEnabled={user?.historyEnabled ?? true} />
}
