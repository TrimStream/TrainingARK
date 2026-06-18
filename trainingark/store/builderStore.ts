import { create } from 'zustand'
import type { Player, StackItem, Card } from '@/types/board'

export type EditableZone = 'battlefield' | 'hand' | 'graveyard' | 'exile' | 'library' | 'command'

interface BuilderState {
	players: [Player, Player, Player, Player] | null
	stack: StackItem[]
	setupComplete: boolean[]
	logLines: string[]
	decklists: string[][]  // per player, card names
	scenarioStarted: boolean

	// Setup
	updatePlayer: (index: number, player: Player) => void
	confirmSetup: (index: number, decklist: string[]) => void

	// Board actions -- all auto-generate log lines
	moveCard: (playerIndex: number, cardId: string, fromZone: EditableZone, toZone: EditableZone) => void
	addCard: (playerIndex: number, zone: EditableZone, card: Card) => void
	silentAddCard: (playerIndex: number, zone: EditableZone, card: Card) => void
	castToStack: (playerIndex: number, cardId: string, fromZone: EditableZone, type: StackItem['type']) => void
	resolveStack: (itemId: string) => void
	removeFromStack: (itemId: string) => void
	setLife: (playerIndex: number, life: number) => void
	setTax: (playerIndex: number, tax: number | [number, number]) => void
	startScenario: () => void
	toggleTapped: (playerIndex: number, cardId: string) => void

	// Log
	addLogLine: (text: string) => void
	editLogLine: (index: number, text: string) => void
	removeLogLine: (index: number) => void
	undoLastAction: () => void
}

type Snapshot = {
	players: [Player, Player, Player, Player]
	stack: StackItem[]
	logLines: string[]
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
	{ id: 'p1', name: 'Player', life: 40, commanderTax: 0, zones: { ...emptyZones } },
	{ id: 'p2', name: 'Opponent 1', life: 40, commanderTax: 0, zones: { ...emptyZones } },
	{ id: 'p3', name: 'Opponent 2', life: 40, commanderTax: 0, zones: { ...emptyZones } },
	{ id: 'p4', name: 'Opponent 3', life: 40, commanderTax: 0, zones: { ...emptyZones } },
]

const ZONE_NAMES: Record<EditableZone, string> = {
    battlefield: 'battlefield',
    hand: 'hand',
    graveyard: 'graveyard',
    exile: 'exile',
    library: 'library',
    command: 'command zone',
}

// History stack for undo -- max 20 entries
let history: Snapshot[] = []

function pushHistory(state: { players: [Player, Player, Player, Player] | null, stack: StackItem[], logLines: string[] }) {
	if (!state.players) return
	history = [...history.slice(-19), {
		players: JSON.parse(JSON.stringify(state.players)),
		stack: JSON.parse(JSON.stringify(state.stack)),
		logLines: [...state.logLines],
	}]
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
	players: defaultPlayers,
	stack: [],
	setupComplete: [false, false, false, false],
	logLines: [],
	decklists: [[], [], [], []],
	scenarioStarted: false,

	updatePlayer: (index, player) => {
		const current = get().players
		if (!current) return
		const updated = [...current] as [Player, Player, Player, Player]
		updated[index] = player
		set({ players: updated })
	},

	confirmSetup: (index, decklist) => {
		const current = get().setupComplete
		const updated = [...current]
		updated[index] = true
		const dl = [...get().decklists]
		dl[index] = decklist
		set({ setupComplete: updated, decklists: dl })
	},

	startScenario: () => set({ scenarioStarted: true }),

	toggleTapped: (playerIndex, cardId) => {
		const state = get()
		if (!state.players) return
		const player = state.players[playerIndex]
		// We need to search all zones for the card
		let found = false
		const updatedZones = {...player.zones}
		for (const zoneName in updatedZones) {
			const zone = updatedZones[zoneName as EditableZone]
			const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
			if (cardIndex !== -1) {
				// Toggle the tapped state of the card
				const updatedCards = [...zone.cards]
				updatedCards[cardIndex] = {
					...updatedCards[cardIndex],
					tapped: !updatedCards[cardIndex].tapped
				}
				updatedZones[zoneName as EditableZone] = {
					...zone,
					cards: updatedCards
				}
				found = true
				break
			}
		}
		if (!found) return
		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = {
			...player,
			zones: updatedZones
		}
		set({ players: updated })
	},

	moveCard: (playerIndex, cardId, fromZone, toZone) => {
		const state = get()
		if (!state.players) return
		pushHistory(state)

		const player = state.players[playerIndex]
		const fromCards = player.zones[fromZone].cards
		const card = fromCards.find((c: Card) => c.id === cardId)
		if (!card) return

		const cleanCard = { ...card, tapped: false }
		const fromCount = player.zones[fromZone].cardCount ?? fromCards.length
		const toCount = player.zones[toZone].cardCount ?? player.zones[toZone].cards.length

		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = {
			...player,
			zones: {
				...player.zones,
				[fromZone]: {
					...player.zones[fromZone],
					cards: fromCards.filter((c: Card) => c.id !== cardId),
					cardCount: Math.max(0, fromCount - 1),
				},
				[toZone]: {
					...player.zones[toZone],
					cards: [...player.zones[toZone].cards, cleanCard],
					cardCount: toCount + 1,
				},
			},
		}

		const logLine = `${card.name} moves from ${player.name}'s ${ZONE_NAMES[fromZone]} to ${ZONE_NAMES[toZone]}.`
		set({ players: updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
	},

	addCard: (playerIndex, zone, card) => {
		const state = get()
		if (!state.players) return
		pushHistory(state)

		const player = state.players[playerIndex]
		const zoneData = player.zones[zone]
		const count = zoneData.cardCount ?? zoneData.cards.length
		const libCount = player.zones.library.cardCount ?? player.zones.library.cards.length

		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = {
			...player,
			zones: {
				...player.zones,
				[zone]: {
					...zoneData,
					cards: [...zoneData.cards, card],
					cardCount: count + 1,
				},
				library: zone !== 'library' ? {
					...player.zones.library,
					cardCount: Math.max(0, libCount - 1),
				} : player.zones.library,
			},
		}

		const logLine = `${player.name} puts ${card.name} onto ${ZONE_NAMES[zone]}.`
		set({ players: updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
	},

	// Silent add used during setup to avoid creating log lines
	silentAddCard: (playerIndex, zone, card) => {
		const state = get()
		if (!state.players) return
		const player = state.players[playerIndex]
		const zoneData = player.zones[zone]
		const count = zoneData.cardCount ?? zoneData.cards.length
		const libCount = player.zones.library.cardCount ?? player.zones.library.cards.length
		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = {
			...player,
			zones: {
				...player.zones,
				[zone]: { ...zoneData, cards: [...zoneData.cards, card], cardCount: count + 1 },
				library: zone !== 'library' ? { ...player.zones.library, cardCount: Math.max(0, libCount - 1) } : player.zones.library,
			},
		}
		set({ players: updated })
	},

	castToStack: (playerIndex, cardId, fromZone, type) => {
		const state = get()
		if (!state.players) return
		pushHistory(state)

		const player = state.players[playerIndex]
		const card = player.zones[fromZone].cards.find((c: Card) => c.id === cardId)
		if (!card) return

		const fromCount = player.zones[fromZone].cardCount ?? player.zones[fromZone].cards.length
		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = {
			...player,
			zones: {
				...player.zones,
				[fromZone]: {
					...player.zones[fromZone],
					cards: player.zones[fromZone].cards.filter((c: Card) => c.id !== cardId),
					cardCount: Math.max(0, fromCount - 1),
				},
			},
		}

		const stackItem: StackItem = {
			id: `stack-${Date.now()}`,
			sourceCardId: card.id,
			sourceCardName: card.name,
			controller: player.name,
			label: card.name,
			type,
			imageUrl: card.imageUrl,
		}

		const typeLabel = type === 'cast' ? 'casts' : type === 'triggered' ? 'triggers' : 'activates'
		const logLine = `${player.name} ${typeLabel} ${card.name}.`
		set({
			players: updated,
			stack: [...state.stack, stackItem],
			logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
		})
	},

	resolveStack: (itemId) => {
		const state = get()
		pushHistory(state)
		const item = state.stack.find(s => s.id === itemId)
		if (!item) return
		set({
			stack: state.stack.filter(s => s.id !== itemId),
			logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName} resolves.`] : state.logLines,
		})
	},

	removeFromStack: (itemId) => {
		const state = get()
		pushHistory(state)
		const item = state.stack.find(s => s.id === itemId)
		if (!item) return
		set({
			stack: state.stack.filter(s => s.id !== itemId),
			logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName} is countered.`] : state.logLines,
		})
	},

	setLife: (playerIndex, life) => {
		const state = get()
		if (!state.players) return
		pushHistory(state)
		const player = state.players[playerIndex]
		const oldLife = player.life
		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = { ...player, life }
		set({
			players: updated,
			logLines: state.scenarioStarted ? [...state.logLines, `${player.name} life: ${oldLife} → ${life}.`] : state.logLines,
		})
	},

	setTax: (playerIndex, tax) => {
		const state = get()
		if (!state.players) return
		const player = state.players[playerIndex]
		const updated = [...state.players] as [Player, Player, Player, Player]
		updated[playerIndex] = { ...player, commanderTax: tax }
		set({ players: updated })
	},

	addLogLine: (text) => {
		set(state => ({ logLines: [...state.logLines, text] }))
	},

	editLogLine: (index, text) => {
		const lines = [...get().logLines]
		lines[index] = text
		set({ logLines: lines })
	},

	removeLogLine: (index) => {
		const lines = [...get().logLines]
		lines.splice(index, 1)
		set({ logLines: lines })
	},

	undoLastAction: () => {
		if (history.length === 0) return
		const snapshot = history[history.length - 1]
		history = history.slice(0, -1)
		set({
			players: snapshot.players,
			stack: snapshot.stack,
			logLines: snapshot.logLines,
		})
	},
}))