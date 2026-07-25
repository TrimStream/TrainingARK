'use client'

import { useSession } from 'next-auth/react'

// The single place the client reads auth state from. Backed by the real
// NextAuth session; the shape is unchanged from the earlier stub so every
// consumer (Sidebar, TopBar, BuilderHeader) keeps working.
export interface AuthUser {
  id: string
  username: string
  avatarInitial: string
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession()

  if (status === 'loading') return { user: null, loading: true }

  const sessionUser = session?.user
  if (!sessionUser?.id) return { user: null, loading: false }

  // No separate username column — fall back to the email local part so the
  // sidebar/avatar always have something to show.
  const username = sessionUser.name?.trim() || sessionUser.email?.split('@')[0] || 'Arkitekt'

  return {
    user: {
      id: sessionUser.id,
      username,
      avatarInitial: username.charAt(0).toUpperCase(),
    },
    loading: false,
  }
}
