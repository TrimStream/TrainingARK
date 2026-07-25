'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { TarkLogo } from '@/components/shell/TarkLogo'
import { safeCallbackUrl } from '@/lib/safeCallbackUrl'
import styles from './AuthForm.module.css'

type Mode = 'login' | 'register'

const COPY = {
  login: {
    heading: 'Sign in',
    sub: 'Sign in to build and publish scenarios.',
    submit: 'Sign in',
    busy: 'Signing in...',
    footer: 'No account yet?',
    footerLink: 'Create one',
    footerHref: '/register',
  },
  register: {
    heading: 'Create account',
    sub: 'One account to build, save and publish cEDH scenarios.',
    submit: 'Create account',
    busy: 'Creating account...',
    footer: 'Already have an account?',
    footerLink: 'Sign in',
    footerHref: '/login',
  },
} as const

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = COPY[mode]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      if (mode === 'register') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? 'Could not create account.')
          setBusy(false)
          return
        }
      }

      // Both flows end in a credentials sign-in so registration lands the
      // user straight in a session.
      const result = await signIn('credentials', { email, password, redirect: false })

      // A bad credential still returns HTTP 200 — the error is on the result.
      if (result?.error) {
        setError(
          mode === 'register'
            ? 'Account created, but sign-in failed. Try signing in.'
            : 'Invalid email or password.'
        )
        setBusy(false)
        return
      }

      router.replace(callbackUrl)
      router.refresh()
    } catch (err) {
      console.error('Auth failed:', err)
      setError('Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="TrainingARK home">
          <TarkLogo size="small" />
        </Link>

        <h1 className={styles.heading}>{copy.heading}</h1>
        <p className={styles.sub}>{copy.sub}</p>

        {error && <p className={styles.error}>{error}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.fieldLabel} htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={busy}>
            {busy ? copy.busy : copy.submit}
          </button>
        </form>

        <p className={styles.footerText}>
          {copy.footer}{' '}
          <Link href={copy.footerHref} className={styles.footerLink}>{copy.footerLink}</Link>
        </p>

        <Link href="/" className={styles.homeLink}>Back to scenarios</Link>
      </div>
    </div>
  )
}
