import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { safeCallbackUrl } from '@/lib/safeCallbackUrl'
import { AuthForm } from '@/components/auth/AuthForm'

export const metadata = { title: 'Sign in · TrainingARK' }

export default async function LoginPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const [session, { callbackUrl }] = await Promise.all([auth(), props.searchParams])
  if (session?.user) redirect(safeCallbackUrl(callbackUrl))

  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
