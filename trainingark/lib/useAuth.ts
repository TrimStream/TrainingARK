'use client'

// Stubbed auth. Always logged out for now. When real auth (NextAuth) lands,
// this hook is the single place that changes — every consumer keeps working.
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
  return { user: null, loading: false }
}