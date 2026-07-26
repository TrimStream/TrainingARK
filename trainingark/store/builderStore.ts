import { create } from 'zustand'
import type { Player, StackItem, Card } from '@/types/board'

export type EditableZone = 'battlefield' | 'hand' | 'graveyard' | 'exile' | 'library' | 'command'

export interface DecisionChoice {
  id: string
  label: string
  quality: 'best' | 'ok' | 'blunder'
  explanation: string
}

export interface DecisionPoint {
  prompt: string
  choices: DecisionChoice[]
}

export interface ScenarioStep {
  id: string
  label: string
  logLines: string[]
  boardState: {
    players: [Player, Player, Player, Player]
    stack: StackItem[]
  }
  decisionPoint?: DecisionPoint
}

interface BuilderState {
  players: [Player, Player, Player, Player] | null
  stack: StackItem[]
  setupComplete: boolean[]
  logLines: string[]
  decklists: string[][]
  scenarioStarted: boolean
  dismissedDuplicateWarnings: Set<string>
  firstPlayerIndex: number
  currentTurnPlayerIndex: number
  turnNumber: number
  handSizes: [number, number, number, number]
  steps: ScenarioStep[]
  lastSavedLogIndex: number

  updatePlayer: (index: number, player: Player) => void
  confirmSetup: (index: number, decklist: string[]) => void
  moveCard: (playerIndex: number, cardId: string, fromZone: EditableZone, toZone: EditableZone, position?: 'top' | 'bottom') => void
  moveAllCards: (playerIndex: number, fromZone: EditableZone, toZone: EditableZone, position?: 'top' | 'bottom') => void
  addCard: (playerIndex: number, zone: EditableZone, card: Card) => void
  silentAddCard: (playerIndex: number, zone: EditableZone, card: Card) => void
  removeCard: (playerIndex: number, cardId: string) => void
  createTokenCopy: (playerIndex: number, cardId: string) => void
  incrementToken: (playerIndex: number, cardId: string) => void
  decrementToken: (playerIndex: number, cardId: string) => void
  castToStack: (playerIndex: number, cardId: string, fromZone: EditableZone, type: StackItem['type']) => void
  resolveStack: (itemId: string) => void
  removeFromStack: (itemId: string) => void
  exileFromStack: (itemId: string) => void
  setLife: (playerIndex: number, life: number) => void
  setTax: (playerIndex: number, tax: number | [number, number]) => void
  setTaxPartner: (playerIndex: number, partnerIndex: 0 | 1, value: number) => void
  startScenario: () => void
  toggleTapped: (playerIndex: number, cardId: string) => void
  toggleRevealed: (playerIndex: number, cardId: string) => void
  drawCard: (playerIndex: number) => void
  shuffleLibrary: (playerIndex: number) => void
  populateLibrary: (playerIndex: number, cards: Card[]) => void
  untapAll: (playerIndex: number) => void
  passTurn: () => void
  setFirstPlayer: (index: number) => void
  setCurrentTurnPlayer: (index: number) => void
  setTurnNumber: (n: number) => void
  setHandSize: (playerIndex: number, size: number) => void
  saveStep: (label: string, decisionPoint?: DecisionPoint) => void
  deleteStep: (stepId: string) => void
  dismissDuplicateWarning: (cardId: string) => void
  isDuplicate: (playerIndex: number, cardName: string, excludeCardId?: string) => boolean
  addLogLine: (text: string) => void
  editLogLine: (index: number, text: string) => void
  removeLogLine: (index: number) => void
  undoLastAction: () => void
  loadScenario: (payload: {
    title: string
    description: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    data: {
      steps: ScenarioStep[]
      decklists: string[][]
      firstPlayerIndex: number
      currentTurnPlayerIndex: number
      turnNumber: number
      handSizes: [number, number, number, number]
      workingState?: {
        players: [Player, Player, Player, Player]
        stack: StackItem[]
        logLines: string[]
        lastSavedLogIndex: number
        setupComplete: boolean[]
        scenarioStarted: boolean
      }
    }
  }) => void
  resetScenario: () => void
  scenarioTitle: string
  scenarioDescription: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  setScenarioTitle: (title: string) => void
  setScenarioDescription: (desc: string) => void
  setDifficulty: (d: 'beginner' | 'intermediate' | 'advanced') => void
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

// A zone can carry a cardCount without materialized Card objects (a library is
// "99 cards" long before a decklist is imported). Anything that has to move
// those cards for real fills the gap with these. Shared with LibraryOrderModal
// so there is one placeholder shape in the app.
let placeholderSeq = 0

export function makeUnknownCard(): Card {
  return {
    id: `placeholder-${Date.now()}-${placeholderSeq++}`,
    name: 'Unknown card',
    cardType: 'instant',
    faceDown: true,
  }
}

function isAbility(type: StackItem['type']): boolean {
  return type === 'triggered' || type === 'activated'
}

// Rebuilds the card for zone placement after stack resolution. Prefers the
// full original card so flags like isCommander survive the round trip.
function cardFromStackItem(item: StackItem): Card {
  if (item.sourceCard) return { ...item.sourceCard }
  return {
    id: item.sourceCardId,
    name: item.sourceCardName,
    imageUrl: item.imageUrl,
    cardType: item.cardType ?? 'instant',
  }
}

function placeCardInZone(
  players: [Player, Player, Player, Player],
  controllerName: string,
  zone: 'battlefield' | 'graveyard' | 'exile',
  card: Card
): [Player, Player, Player, Player] {
  const playerIndex = players.findIndex(p => p.name === controllerName)
  if (playerIndex === -1) return players
  const player = players[playerIndex]
  const zoneData = player.zones[zone]
  const count = zoneData.cardCount ?? zoneData.cards.length
  const updated = [...players] as [Player, Player, Player, Player]
  updated[playerIndex] = {
    ...player,
    zones: {
      ...player.zones,
      [zone]: { ...zoneData, cards: [...zoneData.cards, card], cardCount: count + 1 },
    },
  }
  return updated
}

function stackExistingToken(
  players: [Player, Player, Player, Player],
  playerIndex: number,
  tokenName: string,
  excludeCardId?: string
): { updated: [Player, Player, Player, Player]; newCount: number } | null {
  const player = players[playerIndex]
  const existingIdx = player.zones.battlefield.cards.findIndex(
    c => c.isToken && c.name === tokenName && c.id !== excludeCardId
  )
  if (existingIdx === -1) return null
  const updatedCards = [...player.zones.battlefield.cards]
  const newCount = (updatedCards[existingIdx].stackCount ?? 1) + 1
  updatedCards[existingIdx] = { ...updatedCards[existingIdx], stackCount: newCount }
  const updated = [...players] as [Player, Player, Player, Player]
  updated[playerIndex] = {
    ...player,
    zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: updatedCards } },
  }
  return { updated, newCount }
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  players: defaultPlayers,
  stack: [],
  setupComplete: [false, false, false, false],
  logLines: [],
  decklists: [[], [], [], []],
  scenarioStarted: false,
  dismissedDuplicateWarnings: new Set(),
  firstPlayerIndex: 0,
  currentTurnPlayerIndex: 0,
  turnNumber: 1,
  handSizes: [7, 7, 7, 7],
  steps: [],
  lastSavedLogIndex: 0,
  scenarioTitle: 'Untitled Scenario',
  scenarioDescription: '',
  difficulty: 'beginner',

  updatePlayer: (index, player) => {
    const current = get().players
    if (!current) return
    const updated = [...current] as [Player, Player, Player, Player]
    updated[index] = player
    set({ players: updated })
  },

  setScenarioTitle: (title) => set({ scenarioTitle: title }),
  setScenarioDescription: (desc) => set({ scenarioDescription: desc }),
  setDifficulty: (d) => set({ difficulty: d }),

  confirmSetup: (index, decklist) => {
    const current = get().setupComplete
    const updated = [...current]
    updated[index] = true
    const dl = [...get().decklists]
    dl[index] = decklist
    set({ setupComplete: updated, decklists: dl })
  },

  startScenario: () => set({ scenarioStarted: true }),

  setFirstPlayer: (index) => set({ firstPlayerIndex: index }),
  setCurrentTurnPlayer: (index) => set({ currentTurnPlayerIndex: index }),
  setTurnNumber: (n) => set({ turnNumber: n }),

  setHandSize: (playerIndex, size) => {
    const current = [...get().handSizes] as [number, number, number, number]
    current[playerIndex] = size
    set({ handSizes: current })
  },

  saveStep: (label, decisionPoint) => {
    const state = get()
    if (!state.players) return
    const newStep: ScenarioStep = {
      id: `step-${Date.now()}`,
      label: label || `Step ${state.steps.length + 1}`,
      logLines: state.logLines.slice(state.lastSavedLogIndex),
      boardState: {
        players: JSON.parse(JSON.stringify(state.players)),
        stack: JSON.parse(JSON.stringify(state.stack)),
      },
      ...(decisionPoint && { decisionPoint }),
    }
    set({
      steps: [...state.steps, newStep],
      lastSavedLogIndex: state.logLines.length,
    })
  },

  deleteStep: (stepId) => {
    set(state => ({ steps: state.steps.filter(s => s.id !== stepId) }))
  },

  loadScenario: (payload) => {
    const { data } = payload
    history = []

    // Prefer the live working state (draft support). Fall back to the last
    // step's snapshot for scenarios saved before workingState existed.
    if (data.workingState) {
      const ws = data.workingState
      set({
        scenarioTitle: payload.title,
        scenarioDescription: payload.description,
        difficulty: payload.difficulty,
        steps: data.steps,
        decklists: data.decklists,
        firstPlayerIndex: data.firstPlayerIndex,
        currentTurnPlayerIndex: data.currentTurnPlayerIndex,
        turnNumber: data.turnNumber,
        handSizes: data.handSizes,
        players: JSON.parse(JSON.stringify(ws.players)),
        stack: JSON.parse(JSON.stringify(ws.stack)),
        logLines: [...ws.logLines],
        lastSavedLogIndex: ws.lastSavedLogIndex,
        setupComplete: [...ws.setupComplete],
        scenarioStarted: ws.scenarioStarted,
      })
      return
    }

    const lastStep = data.steps[data.steps.length - 1]
    if (!lastStep) return
    set({
      scenarioTitle: payload.title,
      scenarioDescription: payload.description,
      difficulty: payload.difficulty,
      steps: data.steps,
      decklists: data.decklists,
      firstPlayerIndex: data.firstPlayerIndex,
      currentTurnPlayerIndex: data.currentTurnPlayerIndex,
      turnNumber: data.turnNumber,
      handSizes: data.handSizes,
      players: JSON.parse(JSON.stringify(lastStep.boardState.players)),
      stack: JSON.parse(JSON.stringify(lastStep.boardState.stack)),
      logLines: [],
      lastSavedLogIndex: 0,
      setupComplete: [true, true, true, true],
      scenarioStarted: true,
    })
  },


  // Back to a blank builder — used after deleting the loaded scenario.
  resetScenario: () => {
    history = []
    set({
      players: JSON.parse(JSON.stringify(defaultPlayers)),
      stack: [],
      setupComplete: [false, false, false, false],
      logLines: [],
      decklists: [[], [], [], []],
      scenarioStarted: false,
      dismissedDuplicateWarnings: new Set(),
      firstPlayerIndex: 0,
      currentTurnPlayerIndex: 0,
      turnNumber: 1,
      handSizes: [7, 7, 7, 7],
      steps: [],
      lastSavedLogIndex: 0,
      scenarioTitle: 'Untitled Scenario',
      scenarioDescription: '',
      difficulty: 'beginner',
    })
  },

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
    pushHistory(state)
    const player = state.players[playerIndex]
    let found = false
    let cardName = ''
    let nowTapped = false
    const updatedZones = { ...player.zones }
    for (const zoneName in updatedZones) {
      const zone = updatedZones[zoneName as EditableZone]
      const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
      if (cardIndex !== -1) {
        const updatedCards = [...zone.cards]
        nowTapped = !updatedCards[cardIndex].tapped
        cardName = updatedCards[cardIndex].name
        updatedCards[cardIndex] = { ...updatedCards[cardIndex], tapped: nowTapped }
        updatedZones[zoneName as EditableZone] = { ...zone, cards: updatedCards }
        found = true
        break
      }
    }
    if (!found) return
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = { ...player, zones: updatedZones }
    const logLine = `${player.name}'s ${cardName} is ${nowTapped ? 'tapped' : 'untapped'}.`
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  toggleRevealed: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    // Reveal only means something for opponent seats — the player's own cards
    // are already fully visible to them in the viewer. Guard before
    // pushHistory so a no-op call cannot add an undo entry.
    if (playerIndex === 0) return
    pushHistory(state)
    const player = state.players[playerIndex]
    let found = false
    let cardName = ''
    let nowRevealed = false
    const updatedZones = { ...player.zones }
    for (const zoneName in updatedZones) {
      const zone = updatedZones[zoneName as EditableZone]
      const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
      if (cardIndex !== -1) {
        const updatedCards = [...zone.cards]
        nowRevealed = !updatedCards[cardIndex].revealed
        cardName = updatedCards[cardIndex].name
        updatedCards[cardIndex] = { ...updatedCards[cardIndex], revealed: nowRevealed }
        updatedZones[zoneName as EditableZone] = { ...zone, cards: updatedCards }
        found = true
        break
      }
    }
    if (!found) return
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = { ...player, zones: updatedZones }
    const logLine = `${player.name}'s ${cardName} is ${nowRevealed ? 'revealed' : 'hidden'}.`
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  untapAll: (playerIndex) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const updatedCards = player.zones.battlefield.cards.map((c: Card) => ({ ...c, tapped: false }))
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: updatedCards } },
    }
    set({ players: updated })
  },

  passTurn: () => {
    const state = get()
    if (!state.players) return
    pushHistory(state)

    const currentPlayer = state.players[state.currentTurnPlayerIndex]
    const nextIdx = (state.currentTurnPlayerIndex + 1) % 4
    const nextPlayer = state.players[nextIdx]

    const currentHandCount = currentPlayer.zones.hand.cardCount ?? currentPlayer.zones.hand.cards.length
    const currentHandSize = state.handSizes[state.currentTurnPlayerIndex]

    const untappedCards = nextPlayer.zones.battlefield.cards.map((c: Card) => ({ ...c, tapped: false }))
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[nextIdx] = {
      ...nextPlayer,
      zones: { ...nextPlayer.zones, battlefield: { ...nextPlayer.zones.battlefield, cards: untappedCards } },
    }

    const newTurnNumber = nextIdx === state.firstPlayerIndex
      ? state.turnNumber + 1
      : state.turnNumber

    const newLogLines = [...state.logLines]
    if (currentHandCount > currentHandSize) {
      newLogLines.push(`${currentPlayer.name} must discard down to ${currentHandSize} cards.`)
    }
    newLogLines.push(`Turn ${newTurnNumber} — ${nextPlayer.name} untaps all permanents.`)

    set({
      players: updated,
      currentTurnPlayerIndex: nextIdx,
      turnNumber: newTurnNumber,
      logLines: state.scenarioStarted ? newLogLines : state.logLines,
    })
  },

  moveCard: (playerIndex, cardId, fromZone, toZone, position = 'top') => {
    const state = get()
    if (!state.players) return
    pushHistory(state)

    const player = state.players[playerIndex]
    const fromCardsArr = [...player.zones[fromZone].cards]
    const cardIndex = fromCardsArr.findIndex((c: Card) => c.id === cardId)
    if (cardIndex === -1) return

    const card = fromCardsArr[cardIndex]
    fromCardsArr.splice(cardIndex, 1)

    const fromCount = player.zones[fromZone].cardCount ?? player.zones[fromZone].cards.length
    const toCount = player.zones[toZone].cardCount ?? player.zones[toZone].cards.length
    const cleanCard = { ...card, tapped: false }

    // Library array: end = top (drawn first), start = bottom.
    // 'bottom' prepends, 'top' (and every non-library zone) appends.
    const toCards = position === 'bottom'
      ? [cleanCard, ...player.zones[toZone].cards]
      : [...player.zones[toZone].cards, cleanCard]

    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        [fromZone]: { ...player.zones[fromZone], cards: fromCardsArr, cardCount: Math.max(0, fromCount - 1) },
        [toZone]: { ...player.zones[toZone], cards: toCards, cardCount: toCount + 1 },
      },
    }

    const positionLabel = toZone === 'library' ? (position === 'bottom' ? 'bottom of library' : 'top of library') : ZONE_NAMES[toZone]
    const logLine = `${card.name} moves from ${player.name}'s ${ZONE_NAMES[fromZone]} to ${positionLabel}.`
    set({ players: updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
  },

  moveAllCards: (playerIndex, fromZone, toZone, position = 'top') => {
    const state = get()
    if (!state.players) return

    const player = state.players[playerIndex]
    const fromZoneData = player.zones[fromZone]
    // cardCount is the truth, not cards.length — an unpopulated library reads
    // 99 with an empty cards array. Materialize the difference so a bulk move
    // actually moves what the zone claims to hold.
    const trueCount = fromZoneData.cardCount ?? fromZoneData.cards.length
    if (trueCount === 0) return

    pushHistory(state)

    const unknownCount = Math.max(0, trueCount - fromZoneData.cards.length)
    // Placeholders represent the un-imported bottom of the pile: in a library
    // the array's end is the top, so they go in front of the known cards.
    const movingCards = [
      ...Array.from({ length: unknownCount }, () => makeUnknownCard()),
      ...fromZoneData.cards,
    ]

    const toCount = player.zones[toZone].cardCount ?? player.zones[toZone].cards.length
    const cleanCards = movingCards.map((card: Card) => ({ ...card, tapped: false }))

    // Library array: end = top (drawn first), start = bottom.
    // 'bottom' prepends, 'top' (and every non-library zone) appends.
    const toCards = (toZone === 'library' && position === 'bottom')
      ? [...cleanCards, ...player.zones[toZone].cards]
      : [...player.zones[toZone].cards, ...cleanCards]

    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        // Every card the zone claimed to hold moved, so it ends fully empty.
        [fromZone]: { ...player.zones[fromZone], cards: [], cardCount: 0 },
        [toZone]: { ...player.zones[toZone], cards: toCards, cardCount: toCount + cleanCards.length },
      },
    }

    const positionLabel = toZone === 'library' ? (position === 'bottom' ? 'bottom of library' : 'top of library') : ZONE_NAMES[toZone]
    const logLine = `All cards from ${player.name}'s ${ZONE_NAMES[fromZone]} move to ${positionLabel}.`
    set({ players: updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
  },

  addCard: (playerIndex, zone, card) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)

    const player = state.players[playerIndex]

    // Token stacking: increment existing same-name token instead of adding a new card
    if (card.isToken && zone === 'battlefield') {
      const result = stackExistingToken(state.players, playerIndex, card.name)
      if (result) {
        const logLine = `${player.name} creates another ${card.name} token (×${result.newCount}).`
        set({ players: result.updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
        return
      }
    }

    const zoneData = player.zones[zone]
    const count = zoneData.cardCount ?? zoneData.cards.length
    const libCount = player.zones.library.cardCount ?? player.zones.library.cards.length

    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        // Tokens are created from nothing — only real cards drawn from the library decrement it.
        // Must stay ABOVE [zone]: adding to the library needs the computed key to
        // win, or the card is silently dropped by this passthrough.
        library: (zone !== 'library' && !card.isToken)
          ? { ...player.zones.library, cardCount: Math.max(0, libCount - 1) }
          : player.zones.library,
        [zone]: { ...zoneData, cards: [...zoneData.cards, card], cardCount: count + 1 },
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
        // Ordering matters — see addCard.
        library: (zone !== 'library' && !card.isToken)
          ? { ...player.zones.library, cardCount: Math.max(0, libCount - 1) }
          : player.zones.library,
        [zone]: { ...zoneData, cards: [...zoneData.cards, card], cardCount: count + 1 },
      },
    }
    set({ players: updated })
  },

  removeCard: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const updatedZones = { ...player.zones }
    let found = false
    let removedFromZone: EditableZone | null = null
    let removedCard: Card | null = null
    for (const zoneName in updatedZones) {
      const zone = updatedZones[zoneName as EditableZone]
      const cardIndex = zone.cards.findIndex((c: Card) => c.id === cardId)
      if (cardIndex !== -1) {
        const updatedCards = [...zone.cards]
        removedCard = updatedCards[cardIndex]
        updatedCards.splice(cardIndex, 1)
        const count = zone.cardCount ?? zone.cards.length
        updatedZones[zoneName as EditableZone] = { ...zone, cards: updatedCards, cardCount: Math.max(0, count - 1) }
        removedFromZone = zoneName as EditableZone
        found = true
        break
      }
    }
    if (!found) return

    // Restore library count only for real cards leaving a non-library zone.
    // Tokens never came from the library, so removing one shouldn't give a card back.
    if (removedFromZone && removedFromZone !== 'library' && removedCard && !removedCard.isToken) {
      const libCount = updatedZones.library.cardCount ?? updatedZones.library.cards.length
      updatedZones.library = { ...updatedZones.library, cardCount: libCount + 1 }
    }

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

    const result = stackExistingToken(state.players, playerIndex, source.name, cardId)
    if (result) {
      const logLine = `${player.name} creates another token copy of ${source.name} (×${result.newCount}).`
      set({ players: result.updated, logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines })
      return
    }

    const tokenCopy: Card = { ...source, id: `token-${Date.now()}`, isToken: true, tapped: false, stackCount: 1 }
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: [...player.zones.battlefield.cards, tokenCopy] } },
    }
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, `${player.name} creates a token copy of ${source.name}.`] : state.logLines,
    })
  },

  incrementToken: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const cardIdx = player.zones.battlefield.cards.findIndex(c => c.id === cardId)
    if (cardIdx === -1) return
    const card = player.zones.battlefield.cards[cardIdx]
    const newCount = (card.stackCount ?? 1) + 1
    const updatedCards = [...player.zones.battlefield.cards]
    updatedCards[cardIdx] = { ...card, stackCount: newCount }
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: updatedCards } },
    }
    set({
      players: updated,
      logLines: state.scenarioStarted ? [...state.logLines, `${player.name} creates another ${card.name} token (×${newCount}).`] : state.logLines,
    })
  },

  decrementToken: (playerIndex, cardId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const cardIdx = player.zones.battlefield.cards.findIndex(c => c.id === cardId)
    if (cardIdx === -1) return
    const card = player.zones.battlefield.cards[cardIdx]
    const currentCount = card.stackCount ?? 1
    const updated = [...state.players] as [Player, Player, Player, Player]

    if (currentCount <= 1) {
      const updatedCards = [...player.zones.battlefield.cards]
      updatedCards.splice(cardIdx, 1)
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: updatedCards } },
      }
      set({ players: updated })
    } else {
      const updatedCards = [...player.zones.battlefield.cards]
      updatedCards[cardIdx] = { ...card, stackCount: currentCount - 1 }
      updated[playerIndex] = {
        ...player,
        zones: { ...player.zones, battlefield: { ...player.zones.battlefield, cards: updatedCards } },
      }
      set({
        players: updated,
        logLines: state.scenarioStarted ? [...state.logLines, `${player.name} removes a ${card.name} token (×${currentCount - 1}).`] : state.logLines,
      })
    }
  },

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
            [fromZone]: { ...player.zones[fromZone], cards: fromCardsArr, cardCount: Math.max(0, fromCount - 1) },
          },
        }
      }
    }

    const stackItem: StackItem = {
	  id: `stack-${Date.now()}`,
	  sourceCardId: card.id,
	  sourceCardName: card.name,
	  controller: player.name,
	  label: card.name,
	  type,
	  imageUrl: card.imageUrl,
	  cardType: card.cardType,
	  sourceCard: { ...card, tapped: false },
    }

    const typeLabel = type === 'cast' ? 'casts' : type === 'triggered' ? 'triggers' : 'activates'
    set({
      players: updated,
      stack: [...state.stack, stackItem],
      logLines: state.scenarioStarted ? [...state.logLines, `${player.name} ${typeLabel} ${card.name}.`] : state.logLines,
    })
  },

  resolveStack: (itemId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const item = state.stack.find(s => s.id === itemId)
    if (!item) return

    if (isAbility(item.type)) {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName}'s ability resolves.`] : state.logLines,
      })
      return
    }

    const isPermanent = item.cardType ? PERMANENT_TYPES.has(item.cardType) : false
    const zone = isPermanent ? 'battlefield' : 'graveyard'
    const updated = placeCardInZone(state.players, item.controller, zone, cardFromStackItem(item))
    const logLine = isPermanent
      ? `${item.sourceCardName} resolves onto the battlefield.`
      : `${item.sourceCardName} resolves and is put into the graveyard.`

    set({
      players: updated,
      stack: state.stack.filter(s => s.id !== itemId),
      logLines: state.scenarioStarted ? [...state.logLines, logLine] : state.logLines,
    })
  },

  removeFromStack: (itemId) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const item = state.stack.find(s => s.id === itemId)
    if (!item) return

    if (isAbility(item.type)) {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName}'s ability is removed from the stack.`] : state.logLines,
      })
      return
    }

    const updated = placeCardInZone(state.players, item.controller, 'graveyard', cardFromStackItem(item))
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

    if (isAbility(item.type)) {
      set({
        stack: state.stack.filter(s => s.id !== itemId),
        logLines: state.scenarioStarted ? [...state.logLines, `${item.sourceCardName}'s ability is exiled from the stack.`] : state.logLines,
      })
      return
    }

    const updated = placeCardInZone(state.players, item.controller, 'exile', cardFromStackItem(item))
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
      const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp
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

  populateLibrary: (playerIndex, cards) => {
    const state = get()
    if (!state.players) return
    pushHistory(state)
    const player = state.players[playerIndex]
    const updated = [...state.players] as [Player, Player, Player, Player]
    updated[playerIndex] = {
      ...player,
      zones: {
        ...player.zones,
        library: { cards, revealed: false, cardCount: cards.length },
      },
    }
    set({ players: updated })
  },

  addLogLine: (text) => set(state => ({ logLines: [...state.logLines, text] })),

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
    set({ players: snapshot.players, stack: snapshot.stack, logLines: snapshot.logLines })
  },
}))