'use client'

import { SessionProvider } from 'next-auth/react'
import { BookmarksProvider } from '@/components/scenarios/BookmarksProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Inside SessionProvider: it keys its fetch off the session status. */}
      <BookmarksProvider>{children}</BookmarksProvider>
    </SessionProvider>
  )
}
