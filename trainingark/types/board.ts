export type CardType =
  | 'creature'
  | 'artifact'
  | 'enchantment'
  | 'planeswalker'
  | 'land'
  | 'instant'
  | 'sorcery'
  | 'battle'

export interface Card {
  id: string
  name: string
  imageUrl?: string
  cardType: CardType
  tapped?: boolean
  faceDown?: boolean
  counters?: Record<string, number>
  isToken?: boolean
  isCommander?: boolean
  stackCount?: number
  // Author-controlled per-card reveal. An opponent card marked revealed shows
  // its face in the viewer even inside a zone that is otherwise hidden.
  revealed?: boolean
}

export interface Zone {
  cards: Card[]
  revealed: boolean
  cardCount?: number
}

export interface Player {
  id: string
  name: string
  life: number
  commanderTax: number | [number, number]
  zones: {
    battlefield: Zone
    hand: Zone
    graveyard: Zone
    exile: Zone
    command: Zone
    library: Zone
  }
}

export interface StackItem {
  id: string
  sourceCardId: string
  sourceCardName: string
  controller: string
  label: string
  type: 'cast' | 'triggered' | 'activated'
  imageUrl?: string
  cardType?: CardType
  sourceCard?: Card
}

export type PlayerPosition = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right'