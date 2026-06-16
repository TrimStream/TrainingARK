import { Board } from '@/components/board/Board'
import type { Player } from '@/types/board'

const emptyZones = {
  battlefield: { cards: [], revealed: true },
  hand: { cards: [], revealed: false, cardCount: 0 },
  graveyard: { cards: [], revealed: true },
  exile: { cards: [], revealed: true },
  command: { cards: [], revealed: true },
  library: { cards: [], revealed: false, cardCount: 99 },
}

const testPlayers: [Player, Player, Player, Player] = [
  {
    id: 'p1',
    name: 'You',
    life: 40,
    commanderTax: 0,
    zones: {
      ...emptyZones,
      command: {
        cards: [{ id: 'cmd1', name: 'Kinnan, Bonder Prodigy', cardType: 'creature' }],
        revealed: true,
      },
    },
  },
  {
    id: 'p2',
    name: 'Opponent 1',
    life: 38,
    commanderTax: 2,
    zones: {
      ...emptyZones,
      hand: { cards: [], revealed: false, cardCount: 4 },
      command: {
        cards: [{ id: 'cmd2', name: 'Thrasios, Triton Hero', cardType: 'creature' }],
        revealed: true,
      },
    },
  },
  {
    id: 'p3',
    name: 'Opponent 2',
    life: 40,
    commanderTax: 0,
    zones: {
      ...emptyZones,
      hand: { cards: [], revealed: false, cardCount: 3 },
      command: {
        cards: [{ id: 'cmd3', name: 'Atraxa, Grand Unifier', cardType: 'creature' }],
        revealed: true,
      },
    },
  },
  {
    id: 'p4',
    name: 'Opponent 3',
    life: 35,
    commanderTax: 0,
    zones: {
      ...emptyZones,
      hand: { cards: [], revealed: false, cardCount: 6 },
      command: {
        cards: [{ id: 'cmd4', name: 'Kenrith, the Returned King', cardType: 'creature' }],
        revealed: true,
      },
    },
  },
]

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
      <Board players={testPlayers} revealAll />
    </main>
  )
}