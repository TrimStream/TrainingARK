import { Board } from '@/components/board/Board'
import { ActionLog } from '@/components/board/ActionLog'

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
			<div style={{ flex: 1, minWidth: 0, height: '100%' }}>
				<Board revealAll />
			</div>
			<ActionLog />
		</main>
	)
}