import { Board } from '@/components/board/Board'

export default function BuilderPage() {
  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      background: '#0f0f13',
      display: 'flex',
      padding: 8,
      boxSizing: 'border-box',
    }}>
      <Board revealAll />
    </main>
  )
}