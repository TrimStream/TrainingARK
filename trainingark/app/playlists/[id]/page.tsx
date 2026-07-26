import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PlaylistDetailClient } from '@/components/playlists/PlaylistDetailClient'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Playlist' }

export default async function PlaylistPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  // Server-side gate, same as the dashboard. A playlist's `public` flag is
  // stored but grants nothing yet: only the owner can open this route, and the
  // API enforces that independently.
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/playlists/${id}`)}`)
  }

  return <PlaylistDetailClient playlistId={id} />
}
