'use client'

import { SessionProvider } from 'next-auth/react'
import { BookmarksProvider } from '@/components/scenarios/BookmarksProvider'

const SESSION_REFRESH_INTERVAL_SECONDS = 5 * 60

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={SESSION_REFRESH_INTERVAL_SECONDS}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      {/* Inside SessionProvider: it keys its fetch off the session status. */}
      <BookmarksProvider>{children}</BookmarksProvider>
    </SessionProvider>
  )
}
