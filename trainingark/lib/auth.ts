import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Server-only: this module reaches the database and bcrypt. Never import it
// from a client component — use `useAuth()` (lib/useAuth.ts) there instead.
//
// Session strategy is JWT rather than database sessions: the Credentials
// provider cannot create adapter sessions. The adapter is still wired up so
// the User table (and OAuth tables, if a provider is added later) is managed
// by Auth.js.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        // Users created by a future OAuth provider have no passwordHash —
        // they simply cannot sign in through this provider.
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    // Carry the database user id through the JWT so `session.user.id` is the
    // real Scenario.authorId value everything downstream compares against.
    jwt({ token, user, trigger, session }) {
      if (user?.id) token.id = user.id
      // Sessions are JWTs, so a display-name change in the database is invisible
      // until the token itself is rewritten. The settings page triggers this by
      // calling useSession().update({ name }) after a successful save.
      if (trigger === 'update' && typeof session?.name === 'string') {
        token.name = session.name
      }
      return token
    },
    session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id
      }
      return session
    },
  },
})
