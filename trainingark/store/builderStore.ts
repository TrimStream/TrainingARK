import { create } from 'zustand'
import type { Player, StackItem, Card } from '@/types/board'

export type EditableZone = 'battlefield' | 'hand' | 'graveyard' | 'exile' | 'library' | 'command'

interface BuilderState {
  players: [Player, Player, Player, Player] | null
  stack: StackItem[]
  setupComplete: boolean[]
  logLines: string[]
  decklists: string[][]
  scenarioStarted: boolean
  dismissedDuplicateWarnings: Set<string>

  updatePlayer: (index: number, player: Player) => void
  confirmSetup: (index: number, decklist: string[]) => void

  moveCard: (playerIndex: number, cardId: string, fromZone: EditableZone, toZone: EditableZone) => void
  addCard: (playerIndex: number, zone: EditableZone, card: Card) => void
  silentAddCard: (playerIndex: number, zone: EditableZone, card: Card) => void
  removeCard: (playerIndex: number, cardId: string) => void
  createTokenCopy: (playerIndex: number, cardId: string) => void
  castToStack: (playerIndex: number, cardId: string, fromZone: EditableZone, type: StackItem['type']) => void
  resolveStack: (itemId: string) => void
  removeFromStack: (itemId: string) => void
  exileFromStack: (itemId: string) => void
  setLife: (playerIndex: number, life: number) => void
  setTax: (playerIndex: number, tax: number | [number, number]) => void
  setTaxPartner: (playerIndex: number, partnerIndex: 0 | 1, value: number) => void
  startScenario: () => void
  toggleTapped: (playerIndex: number, cardId: string) => void
  drawCard: (playerIndex: number) => void
  shuffleLibrary: (playerIndex: number) => void
  dismissDuplicateWarning: (cardId: string) => void
  isDuplicate: (playerIndex: number, cardName: string, excludeCardId?: string) => boolean

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

const PERMANENT_TYPES = new Set(['creature', 'artifact', 'enchantment', 'planeswalker', 'land', 'battle'])

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
  dismissedDuplicateWarnings: new Set(),

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

  isDuplicate: (playerIndex, cardName, excludeCardId) => {
    const state = get()
    if (!state.players) return false
    const player = state.players[playerIndex]
    const allCards = Object.values(player.zones).flatMap(z => z.cards)
    return allCards.some(c => c.name === cardName && c.id !== excludeCardId && !c.isToken)
  },

  dismissDuplicateWarning: (cardId) => {
    const set2 = new Set(get().dismissedDuplicateWarnings)
    set2.add(cardId)
    set({ dismissedDuplicateWarnings: set2 })
  },

  toggleTapped: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    const player = state.players[playerIndex]
    let found = false
    const updatedZones = { ...player.zones }
    for (const zoneName in updatedZones) {
      const zone = updatedZones[zoneName as EditableZone]
      const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
      if (cardIndex !== -1) {
        const updatedCards = [...zone.cards]
        updatedCards[cardIndex] = { ...updatedCards[cardIndex], tapped: !updatedCards[cardIndex].tapped }
        updatedZones[zoneName as EditableZone] = { ...zone, cards: updatedCards }
        found = true
        break
      }
    }
    if (!found) return
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = { ...player, zones: updatedZones }
    set({ players: updated })
  },

  // Fix #7: use findIndex + splice so only the first matching card is removed,
  // not all cards that share a Scryfall UUID.
  moveCard: (playerIndex, cardId, fromZone, toZone) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)

    const player = state.players[playerIndex]
    const fromCardsArr = [...player.zones[fromZone].cards]
    const cardIndex = fromCardsArr.findIndex((c: Card) => c.id === cardId)
    if (cardIndex === -1) return

    const card = fromCardsArr[cardIndex]
    fromCardsArr.splice(cardIndex, 1)

    const cleanCard = { ...card, tapped: false }
    const fromCount = player.zones[fromZone].cardCount ?? player.zones[fromZone].cards.length
    const toCount = player.zones[toZone].cardCount ?? player.zones[toZone].cards.length

    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        [fromZone]: { ...player.zones[fromZone], cards: fromCardsArr, cardCount: Math.max(0, fromCount - 1) },
        [toZone]: { ...player.zones[toZone], cards: [...player.zones[toZone].cards, cleanCard], cardCount: toCount + 1 },
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
        [zone]: { ...zoneData, cards: [...zoneData.cards, card], cardCount: count + 1 },
        library: zone !== 'library' ? { ...player.zones.library, cardCount: Math.max(0, libCount - 1) } : player.zones.library,
      },
    }

    const logLine = `${player.name} puts ${card.name} onto ${ZONE_NAMES[zone]}.`
    set({ players: updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
  },

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

  // Fix #7: splice at first matching index instead of filter.
  // Fix #6: no log line for removal.
  removeCard: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const updatedZones = { ...player.zones }
    let found = false
    for (const zoneName in updatedZones) {
      const zone = updatedZones[zoneName as EditableZone]
      const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
      if (cardIndex !== -1) {
        const updatedCards = [...zone.cards]
        updatedCards.splice(cardIndex, 1)
        const count = zone.cardCount ?? zone.cards.length
        updatedZones[zoneName as EditableZone] = {
          ...zone,
          cards: updatedCards,
          cardCount: Math.max(0, count - 1),
        }
        found = true
        break
      }
    }
    if (!found) return
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = { ...player, zones: updatedZones }
    set({ players: updated })
  },

  createTokenCopy: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const source = player.zones.battlefield.cards.find((c: Card) => c.id === cardId)
    if (!source) return
    const tokenCopy: Card = {
      ...source,
      id: `token-${Date.now()}`,
      isToken: true,
      tapped: false,
    }
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        battlefield: { ...player.zones.battlefield, cards: [...player.zones.battlefield.cards, tokenCopy] },
      },
    }
    const logLine = `${player.name} creates a token copy of ${source.name}.`
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  // Fix #9: triggered/activated abilities stay on the battlefield — only 'cast' removes the source card.
  castToStack: (playerIndex, cardId, fromZone, type) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)

    const player = state.players[playerIndex]
    const card = player.zones[fromZone].cards.find((c: Card) => c.id === cardId)
    if (!card) return

    let updated = [...state.players] as [Player, Player, Player, Player]

    if (type === 'cast') {
      const fromCardsArr = [...player.zones[fromZone].cards]
      const removeIndex = fromCardsArr.findIndex((c: Card) => c.id === cardId)
      if (removeIndex !== -1) {
        fromCardsArr.splice(removeIndex, 1)
        const fromCount = player.zones[fromZone].cardCount ?? player.zones[fromZone].cards.length
        updated[playerIndex] = {
          ...player,
          zones: {
            ...player.zones,
            [fromZone]: {
              ...player.zones[fromZone],
              cards: fromCardsArr,
              cardCount: Math.max(0, fromCount - 1),
            },
          },
        }
      }
    }
    // triggered/activated: card stays where it is, only the ability goes on the stack

    const stackItem: StackItem = {
      id: `stack-${Date.now()}`,
      sourceCardId: card.id,
      sourceCardName: card.name,
      controller: player.name,
      label: card.name,
      type,
      imageUrl: card.imageUrl,
      cardType: card.cardType,
    }

    const typeLabel = type === 'cast' ? 'casts' : type === 'triggered' ? 'triggers' : 'activates'
    const logLine = `${player.name} ${typeLabel} ${card.name}.`
    set({
      players: updated,
      stack: [...state.stack, stackItem],
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  // Fix #9: triggered/activated abilities just resolve — no card movement.
  resolveStack: (itemId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const item = state.stack.find(s => s.id === itemId)
    if (!item) return

    // Abilities resolve without moving any card
    if (item.type === 'triggered' || item.type === 'activated') {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted
          ? [...state.logLines, `${item.sourceCardName}'s ability resolves.`]
          : state.logLines,
      })
      return
    }

    // Cast spells: permanents go to battlefield, non-permanents to graveyard
    const playerIndex = state.players.findIndex(p => p.name === item.controller)
    const isPermanent = item.cardType ? PERMANENT_TYPES.has(item.cardType) : false
    let logLine = `${item.sourceCardName} resolves.`
    let updated = state.players

    if (playerIndex !== -1 && isPermanent) {
      const player = state.players[playerIndex]
      const resolvedCard: Card = {
        id: item.sourceCardId,
        name: item.sourceCardName,
        imageUrl: item.imageUrl,
        cardType: item.cardType ?? 'artifact',
      }
      updated = [...state.players] as [Player, Player, Player, Player]
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: [...player.zones.battlefield.cards, resolvedCard] } },
      }
      logLine = `${item.sourceCardName} resolves onto the battlefield.`
    } else if (playerIndex !== -1) {
      const player = state.players[playerIndex]
      const resolvedCard: Card = {
        id: item.sourceCardId,
        name: item.sourceCardName,
        imageUrl: item.imageUrl,
        cardType: item.cardType ?? 'instant',
      }
      const gyCount = player.zones.graveyard.cardCount ?? player.zones.graveyard.cards.length
      updated = [...state.players] as [Player, Player, Player, Player]
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, graveyard: { ...player.zones.graveyard, cards: [...player.zones.graveyard.cards, resolvedCard], cardCount: gyCount + 1 } },
      }
      logLine = `${item.sourceCardName} resolves and is put into the graveyard.`
    }

    set({
      players: updated,
      stack: state.stack.filter(s => s.id !== itemId),
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  // Fix #9: abilities countered/removed just disappear — no card movement.
  removeFromStack: (itemId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const item = state.stack.find(s => s.id === itemId)
    if (!item) return

    if (item.type === 'triggered' || item.type === 'activated') {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted
          ? [...state.logLines, `${item.sourceCardName}'s ability is removed from the stack.`]
          : state.logLines,
      })
      return
    }

    const playerIndex = state.players.findIndex(p => p.name === item.controller)
    let updated = state.players
    if (playerIndex !== -1) {
      const player = state.players[playerIndex]
      const resolvedCard: Card = { id: item.sourceCardId, name: item.sourceCardName, imageUrl: item.imageUrl, cardType: item.cardType ?? 'instant' }
      const gyCount = player.zones.graveyard.cardCount ?? player.zones.graveyard.cards.length
      updated = [...state.players] as [Player, Player, Player, Player]
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, graveyard: { ...player.zones.graveyard, cards: [...player.zones.graveyard.cards, resolvedCard], cardCount: gyCount + 1 } },
      }
    }

    set({
      players: updated,
      stack: state.stack.filter(s => s.id !== itemId),
      logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName} is countered and put into the graveyard.`] : state.logLines,
    })
  },

  exileFromStack: (itemId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const item = state.stack.find(s => s.id === itemId)
    if (!item) return

    if (item.type === 'triggered' || item.type === 'activated') {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted
          ? [...state.logLines, `${item.sourceCardName}'s ability is exiled from the stack.`]
          : state.logLines,
      })
      return
    }

    const playerIndex = state.players.findIndex(p => p.name === item.controller)
    let updated = state.players
    if (playerIndex !== -1) {
      const player = state.players[playerIndex]
      const resolvedCard: Card = { id: item.sourceCardId, name: item.sourceCardName, imageUrl: item.imageUrl, cardType: item.cardType ?? 'instant' }
      const exCount = player.zones.exile.cardCount ?? player.zones.exile.cards.length
      updated = [...state.players] as [Player, Player, Player, Player]
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, exile: { ...player.zones.exile, cards: [...player.zones.exile.cards, resolvedCard], cardCount: exCount + 1 } },
      }
    }

    set({
      players: updated,
      stack: state.stack.filter(s => s.id !== itemId),
      logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName} is exiled.`] : state.logLines,
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

  setTaxPartner: (playerIndex, partnerIndex, value) => {
    const state = get()
    if (!state.players) return
    const player = state.players[playerIndex]
    const current = player.commanderTax
    const tax: [number, number] = Array.isArray(current) ? [current[0], current[1]] : [current, 0]
    tax[partnerIndex] = value
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = { ...player, commanderTax: tax }
    set({ players: updated })
  },

  drawCard: (playerIndex) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const libCards = player.zones.library.cards
    const libCount = player.zones.library.cardCount ?? libCards.length
    if (libCount === 0) return

    let drawnCard: Card
    let newLibCards: Card[]
    if (libCards.length > 0) {
      drawnCard = libCards[libCards.length - 1]
      newLibCards = libCards.slice(0, -1)
    } else {
      drawnCard = { id: `lib-${Date.now()}`, name: 'Card drawn from library', cardType: 'instant', faceDown: true }
      newLibCards = []
    }

    const handCount = player.zones.hand.cardCount ?? player.zones.hand.cards.length
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        library: { ...player.zones.library, cards: newLibCards, cardCount: Math.max(0, libCount - 1) },
        hand: { ...player.zones.hand, cards: [...player.zones.hand.cards, drawnCard], cardCount: handCount + 1 },
      },
    }
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, `${player.name} draws a card.`] : state.logLines,
    })
  },

  shuffleLibrary: (playerIndex) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const shuffled = [...player.zones.library.cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = tmp
    }
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: { ...player.zones, library: { ...player.zones.library, cards: shuffled } },
    }
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, `${player.name} shuffles their library.`] : state.logLines,
    })
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