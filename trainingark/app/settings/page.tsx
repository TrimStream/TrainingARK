import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ContentPage } from '@/components/shell/ContentPage'
import { SettingsClient } from '@/components/settings/SettingsClient'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  // Server-side gate, same as the builder and dashboard.
  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent('/settings')}`)

  // Seeded from the session so the form paints filled in, with the same
  // name → email-local-part fallback useAuth() uses for the sidebar.
  const email = session.user.email ?? ''
  const name = session.user.name?.trim() || email.split('@')[0] || ''

  return (
    <ContentPage title="Settings">
      <SettingsClient email={email} name={name} />
    </ContentPage>
  )
}
