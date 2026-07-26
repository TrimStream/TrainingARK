import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your library' }

export default async function DashboardPage() {
  // Server-side gate, same as the builder: a logged-out visitor never receives
  // the page at all.
  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent('/dashboard')}`)

  return <DashboardClient />
}
