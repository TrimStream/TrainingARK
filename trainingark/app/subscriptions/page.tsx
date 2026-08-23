import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SubscriptionsClient } from '@/components/subscriptions/SubscriptionsClient'

export const metadata: Metadata = { title: 'Subscriptions' }

export default async function SubscriptionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent('/subscriptions')}`)
  return <SubscriptionsClient />
}
