import { Board } from '@/components/board/Board'
import { ActionLog } from '@/components/board/ActionLog'
import { BuilderHeader } from '@/components/board/BuilderHeader'

export default function BuilderPage() {
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
        <BuilderHeader />
        <div style={{ flex: 1, minHeight: 0 }}>
          <Board revealAll />
        </div>
      </div>
      <ActionLog />
    </main>
  )
}