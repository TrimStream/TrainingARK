import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Board } from '@/components/board/Board'
import { ActionLog } from '@/components/board/ActionLog'
import { BuilderHeader } from '@/components/board/BuilderHeader'

export default async function BuilderPage(props: {
  searchParams: Promise<{ id?: string | string[] }>
}) {
  // Server-side gate: a logged-out visitor never receives the builder UI.
  const [session, { id }] = await Promise.all([auth(), props.searchParams])
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent('/builder')}`)

  // ?id=xxx is the dashboard's "Edit" deep link. The header loads it through
  // the same path as its Load modal; a missing or malformed param just opens
  // an empty builder.
  const initialScenarioId = typeof id === 'string' && id ? id : undefined

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      background: '#0f0f13',
      display: 'flex',
      padding: 8,
      gap: 8,
      boxSizing: 'border-box',
    }}>
      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <BuilderHeader initialScenarioId={initialScenarioId} />
        <div style={{ flex: 1, minHeight: 0 }}>
          <Board revealAll />
        </div>
      </div>
      <ActionLog />
    </main>
  )
}