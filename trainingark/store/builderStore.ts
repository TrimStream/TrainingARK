import { create } from 'zustand'
import type { Player, StackItem } from '@/types/board'

interface BuilderState {
  players: [Player, Player, Player, Player] | null
  stack: StackItem[]
  setupComplete: boolean[]  // one per player, true when commander modal confirmed

  setPlayers: (players: [Player, Player, Player, Player]) => void
  updatePlayer: (index: number, player: Player) => void
  confirmSetup: (index: number) => void
  setStack: (stack: StackItem[]) => void
}

const emptyZones = {
  battlefield: { cards: [], revealed: true },
  hand: { cards: [], revealed: false, cardCount: 0 },
  graveyard: { cards: [], revealed: true },
  exile: { cards: [], revealed: true },
  command: { cards: [], revealed: true },
  library: { cards: [], revealed: false, cardCount: 99 },
}

const defaultPlayers: [Player, Player, Player, Player] = [
  { id: 'p1', name: 'You', life: 40, commanderTax: 0, zones: { ...emptyZones } },
  { id: 'p2', name: 'Opponent 1', life: 40, commanderTax: 0, zones: { ...emptyZones } },
  { id: 'p3', name: 'Opponent 2', life: 40, commanderTax: 0, zones: { ...emptyZones } },
  { id: 'p4', name: 'Opponent 3', life: 40, commanderTax: 0, zones: { ...emptyZones } },
]

export const useBuilderStore = create<BuilderState>((set, get) => ({
  players: defaultPlayers,
  stack: [],
  setupComplete: [false, false, false, false],

  setPlayers: (players) => set({ players }),

  updatePlayer: (index, player) => {
    const current = get().players
    if (!current) return
    const updated = [...current] as [Player, Player, Player, Player]
    updated[index] = player
    set({ players: updated })
  },

  confirmSetup: (index) => {
    const current = get().setupComplete
    const updated = [...current] as boolean[]
    updated[index] = true
    set({ setupComplete: updated })
  },

  setStack: (stack) => set({ stack }),
}))