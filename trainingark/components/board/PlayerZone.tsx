'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Player, PlayerPosition, Card } from '@/types/board'
import styles from './PlayerZone.module.css'
import { BoardCard } from './BoardCard'
import type { ZoneTarget, StackType } from './CardContextMenu'
import { CommanderSetupModal } from './CommanderSetupModal'
import { useBuilderStore, type EditableZone } from '@/store/builderStore'

interface PlayerZoneProps {
  playerIndex: number
  position: PlayerPosition
  revealAll?: boolean
}

const CARD_BACK = '/back_magic.png'
const CARD_W = 60
const CARD_H = 84
const HAND_OVERLAP = 28

type ExpandableZone = 'hand' | 'graveyard' | 'exile'

function formatTax(tax: Player['commanderTax']): string {
  if (Array.isArray(tax)) return `Tax: ${tax[0]} / ${tax[1]}`
  return `Tax: ${tax}`
}

const PLAYER_NAMES = ['Player', 'Opponent 1', 'Opponent 2', 'Opponent 3']

const ZONE_TARGET_MAP: Record<ZoneTarget, EditableZone> = {
  battlefield: 'battlefield',
  hand: 'hand',
  graveyard: 'graveyard',
  exile: 'exile',
  'library-top': 'library',
  'library-bottom': 'library',
}

export function PlayerZone({ playerIndex, position, revealAll }: PlayerZoneProps) {
  const {
    players, updatePlayer, confirmSetup, setupComplete,
    moveCard, addCard, castToStack, setLife, setTax, decklists,
  } = useBuilderStore()

  const player = players?.[playerIndex]
  const isSetupDone = setupComplete[playerIndex]
  const decklist = decklists[playerIndex]

  const [expanded, setExpanded] = useState<ExpandableZone | null>(null)
  const [showCardSearch, setShowCardSearch] = useState<EditableZone | null>(null)
  const [cardSearchRect, setCardSearchRect] = useState<DOMRect | null>(null)
  const [editingLife, setEditingLife] = useState(false)
  const [lifeInput, setLifeInput] = useState('')
  const [editingTax, setEditingTax] = useState(false)
  const [taxInput, setTaxInput] = useState('')
  const addBtnRef = useRef<HTMLButtonElement>(null)

  const isTop = position === 'top-left' || position === 'top-right'
  const isRight = position === 'top-right' || position === 'bottom-right'

  function toggle(zone: ExpandableZone) {
    setExpanded(prev => prev === zone ? null : zone)
  }

  function zoneCount(zoneName: keyof Player['zones']): number {
    if (!player) return 0
    const zone = player.zones[zoneName]
    return zone.cardCount ?? zone.cards.length
  }

  function cardSrc(card: Card, revealed: boolean): string {
    return revealed && card.imageUrl ? card.imageUrl : CARD_BACK
  }

  function handleMove(cardId: string, target: ZoneTarget) {
    const toZone = ZONE_TARGET_MAP[target]
    if (!player) return
    for (const [zoneName, zone] of Object.entries(player.zones)) {
      if (zone.cards.find((c: Card) => c.id === cardId)) {
        moveCard(playerIndex, cardId, zoneName as EditableZone, toZone)
        return
      }
    }
  }

  function handleCastToStack(cardId: string, type: StackType) {
    if (!player) return
    for (const [zoneName, zone] of Object.entries(player.zones)) {
      if (zone.cards.find((c: Card) => c.id === cardId)) {
        castToStack(playerIndex, cardId, zoneName as EditableZone, type)
        return
      }
    }
  }

  function handleAddCard(zone: EditableZone, rect: DOMRect) {
    setShowCardSearch(zone)
    setCardSearchRect(rect)
  }

  function handleCardSelected(card: Card) {
    if (!showCardSearch) return
    if (decklist.length > 0 && !decklist.includes(card.name)) return
    addCard(playerIndex, showCardSearch, card)
    setShowCardSearch(null)
    setCardSearchRect(null)
  }

  function handleSetupConfirm(partial: Partial<Player>, _commanderNames: string[], dl: string[]) {
    if (!player) return
    const updated: Player = {
      ...(player as Player),
      ...partial,
      zones: {
        ...(player as Player).zones,
        ...(partial.zones ?? {}),
      },
      commanderTax: partial.commanderTax ?? 0,
    }
    updatePlayer(playerIndex, updated)
    confirmSetup(playerIndex, dl)
  }

  function commitLife() {
    const val = parseInt(lifeInput)
    if (!isNaN(val)) setLife(playerIndex, val)
    setEditingLife(false)
  }

  function commitTax() {
    if (!player) return
    const val = parseInt(taxInput)
    if (isNaN(val)) { setEditingTax(false); return }
    if (Array.isArray(player.commanderTax)) {
      setTax(playerIndex, [val, player.commanderTax[1]])
    } else {
      setTax(playerIndex, val)
    }
    setEditingTax(false)
  }

  if (!player) return null

  const handCount = zoneCount('hand')
  const handRevealed = revealAll || player.zones.hand.revealed
  const handCards = player.zones.hand.cards

  function renderHand() {
    const count = handRevealed && handCards.length > 0 ? handCards.length : handCount
    const totalWidth = CARD_W + Math.max(0, count - 1) * HAND_OVERLAP

    return (
      <div
        className={styles.handFan}
        style={{ width: Math.max(totalWidth, CARD_W) }}
        onClick={() => toggle('hand')}
      >
        {handRevealed && handCards.length > 0
          ? handCards.map((card: Card, i: number) => (
              <div key={card.id} className={styles.fanCard} style={{ left: i * HAND_OVERLAP }}>
                <Image src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
              </div>
            ))
          : Array.from({ length: count }).map((_, i: number) => (
              <div key={i} className={styles.fanCard} style={{ left: i * HAND_OVERLAP }}>
                <Image src={CARD_BACK} alt="Card back" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
              </div>
            ))
        }
      </div>
    )
  }

  function renderPile(cards: Card[], count: number, revealed: boolean) {
    if (count === 0) {
      return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    }
    const topCard = cards[cards.length - 1]
    return (
      <div style={{ width: CARD_W, height: CARD_H, position: 'relative', cursor: 'pointer' }}>
        <Image
          src={topCard && revealed ? cardSrc(topCard, true) : CARD_BACK}
          alt="top card"
          width={CARD_W}
          height={CARD_H}
          style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }}
        />
      </div>
    )
  }

  function renderCommandZone() {
    const cards = (player as Player).zones.command.cards
    if (cards.length === 0) {
      return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    }
    return (
      <div style={{ position: 'relative', width: cards.length === 1 ? CARD_W : CARD_W + 16, height: CARD_H }}>
        {cards.map((card: Card, i: number) => (
          <div key={card.id} style={{ position: 'absolute', left: i * 16, top: 0, zIndex: i }}>
            <Image
              src={cardSrc(card, true)}
              alt={card.name}
              width={CARD_W}
              height={CARD_H}
              style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }}
            />
          </div>
        ))}
      </div>
    )
  }

  const expandedPanel = expanded && (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedLabel}>
        {expanded === 'hand'
          ? `Hand (${handCount})`
          : expanded === 'graveyard'
          ? `Graveyard (${zoneCount('graveyard')})`
          : `Exile (${zoneCount('exile')})`}
        <button className={styles.closeExpanded} onClick={() => setExpanded(null)}>x</button>
      </div>
      <div className={styles.expandedCards}>
        {expanded === 'hand' && (
          handRevealed && handCards.length > 0
            ? handCards.map((card: Card) => (
                <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
              ))
            : Array.from({ length: handCount }).map((_, i: number) => (
                <Image key={i} src={CARD_BACK} alt="Card back" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
              ))
        )}
        {expanded === 'graveyard' && player.zones.graveyard.cards.map((card: Card) => (
          <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
        ))}
        {expanded === 'exile' && player.zones.exile.cards.map((card: Card) => (
          <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
        ))}
      </div>
    </div>
  )

  const lifeDisplay = editingLife ? (
    <input
      className={styles.inlineInput}
      type="number"
      value={lifeInput}
      onChange={e => setLifeInput(e.target.value)}
      onBlur={commitLife}
      onKeyDown={e => { if (e.key === 'Enter') commitLife(); if (e.key === 'Escape') setEditingLife(false) }}
      autoFocus
    />
  ) : (
    <span
      className={styles.playerLife}
      onClick={() => { setLifeInput(String(player.life)); setEditingLife(true) }}
      title="Click to edit"
    >
      {player.life}
    </span>
  )

  const taxDisplay = editingTax ? (
    <input
      className={styles.inlineInput}
      type="number"
      value={taxInput}
      onChange={e => setTaxInput(e.target.value)}
      onBlur={commitTax}
      onKeyDown={e => { if (e.key === 'Enter') commitTax(); if (e.key === 'Escape') setEditingTax(false) }}
      autoFocus
    />
  ) : (
    <span
      className={styles.playerTax}
      onClick={() => {
        const t = player.commanderTax
        setTaxInput(String(Array.isArray(t) ? t[0] : t))
        setEditingTax(true)
      }}
      title="Click to edit"
    >
      {formatTax(player.commanderTax)}
    </span>
  )

  const playerMetaBlock = (
    <div className={styles.playerMeta}>
      <span className={styles.playerName}>{player.name}</span>
      {lifeDisplay}
      {taxDisplay}
    </div>
  )

  const rightSideZones = (
    <>
      <div className={styles.zoneSection} style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.zoneLabel} onClick={() => toggle('hand')}>
          Hand ({handCount}) {expanded === 'hand' ? '▲' : '▼'}
        </div>
        {renderHand()}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabel}>Library ({zoneCount('library')})</div>
        {renderPile([], zoneCount('library'), false)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} onClick={() => toggle('graveyard')}>
        <div className={styles.zoneLabel}>Graveyard ({zoneCount('graveyard')}) {expanded === 'graveyard' ? '▲' : '▼'}</div>
        {renderPile(player.zones.graveyard.cards, zoneCount('graveyard'), true)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} onClick={() => toggle('exile')}>
        <div className={styles.zoneLabel}>Exile ({zoneCount('exile')}) {expanded === 'exile' ? '▲' : '▼'}</div>
        {renderPile(player.zones.exile.cards, zoneCount('exile'), true)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabel}>Command</div>
        {renderCommandZone()}
      </div>
    </>
  )

  const leftSideZones = (
    <>
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabel}>Command</div>
        {renderCommandZone()}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} onClick={() => toggle('exile')}>
        <div className={styles.zoneLabel}>Exile ({zoneCount('exile')}) {expanded === 'exile' ? '▲' : '▼'}</div>
        {renderPile(player.zones.exile.cards, zoneCount('exile'), true)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} onClick={() => toggle('graveyard')}>
        <div className={styles.zoneLabel}>Graveyard ({zoneCount('graveyard')}) {expanded === 'graveyard' ? '▲' : '▼'}</div>
        {renderPile(player.zones.graveyard.cards, zoneCount('graveyard'), true)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabel}>Library ({zoneCount('library')})</div>
        {renderPile([], zoneCount('library'), false)}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.zoneLabel} onClick={() => toggle('hand')}>
          Hand ({handCount}) {expanded === 'hand' ? '▲' : '▼'}
        </div>
        {renderHand()}
      </div>
    </>
  )

  const strip = (
    <div className={`${styles.strip} ${isTop ? styles.stripTop : ''}`}>
      {isRight && (
        <>
          {playerMetaBlock}
          <div className={styles.stripDivider} />
        </>
      )}
      {isRight ? rightSideZones : leftSideZones}
      {!isRight && (
        <>
          <div className={styles.stripDivider} />
          {playerMetaBlock}
        </>
      )}
    </div>
  )

  const battlefield = player.zones.battlefield.cards
  const creatures = battlefield.filter((c: Card) => c.cardType === 'creature')
  const nonlands = battlefield.filter((c: Card) =>
    c.cardType === 'artifact' || c.cardType === 'enchantment' || c.cardType === 'planeswalker'
  )
  const lands = battlefield.filter((c: Card) => c.cardType === 'land')

  const sections = [
    <div key="creatures" className={styles.section}>
      {creatures.map((card: Card) => (
        <BoardCard
          key={card.id}
          card={card}
          onMove={t => handleMove(card.id, t)}
          onCastToStack={t => handleCastToStack(card.id, t)}
          currentZone="battlefield"
        />
      ))}
    </div>,
    <div key="nonlands" className={styles.section}>
      {nonlands.map((card: Card) => (
        <BoardCard
          key={card.id}
          card={card}
          onMove={t => handleMove(card.id, t)}
          onCastToStack={t => handleCastToStack(card.id, t)}
          currentZone="battlefield"
        />
      ))}
    </div>,
    <div key="lands" className={styles.section}>
      {lands.map((card: Card) => (
        <BoardCard
          key={card.id}
          card={card}
          onMove={t => handleMove(card.id, t)}
          onCastToStack={t => handleCastToStack(card.id, t)}
          currentZone="battlefield"
        />
      ))}
    </div>,
  ]

  const addBtnClass = isTop ? styles.addCardBtnBottom : styles.addCardBtnTop

  return (
    <div className={styles.playmat}>
      {!isSetupDone && (
        <CommanderSetupModal
          playerIndex={playerIndex}
          playerName={PLAYER_NAMES[playerIndex]}
          onConfirm={handleSetupConfirm}
        />
      )}
      {isTop && expandedPanel}
      {isTop && strip}
      <div className={styles.battlefield}>
        <div className={styles.watermarkWrap}>
          <Image src="/tark-dark.png" alt="" fill style={{ objectFit: 'contain' }} />
        </div>
        {isTop ? [...sections].reverse() : sections}
        <button
          ref={addBtnRef}
          className={`${styles.addCardBtn} ${addBtnClass}`}
          onClick={() => {
            const rect = addBtnRef.current?.getBoundingClientRect()
            if (rect) handleAddCard('battlefield', rect)
          }}
        >
          + Add card
        </button>
      </div>
      {!isTop && strip}
      {!isTop && expandedPanel}
      {showCardSearch && cardSearchRect && (
        <div style={{ position: 'fixed', top: cardSearchRect.bottom + 4, left: cardSearchRect.left, zIndex: 1000 }}>
          <CardAddSearch
            decklist={decklist}
            onSelect={handleCardSelected}
            onClose={() => setShowCardSearch(null)}
          />
        </div>
      )}
    </div>
  )
}

function CardAddSearch({ decklist, onSelect, onClose }: {
  decklist: string[]
  onSelect: (card: Card) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function filterByDecklist(): string[] {
    if (decklist.length === 0) return []
    const q = query.toLowerCase()
    return decklist.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setSuggestions([]); return }

    if (decklist.length > 0) {
      setSuggestions(filterByDecklist())
      setActiveIndex(-1)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions((data.data ?? []).slice(0, 8))
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function selectCard(name: string) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
      if (!res.ok) return
      const data = await res.json()
      const card: Card = {
        id: data.id,
        name: data.name,
        imageUrl: data.image_uris?.normal ?? data.card_faces?.[0]?.image_uris?.normal,
        cardType: parseCardType(data.type_line ?? ''),
      }
      onSelect(card)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.cardAddSearch}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <input
          className={styles.cardAddInput}
          placeholder={decklist.length > 0 ? 'Search decklist...' : 'Search all cards...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { onClose(); return }
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
            if (e.key === 'Enter') {
              const name = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
              if (name) void selectCard(name)
            }
          }}
          autoFocus
          autoComplete="off"
        />
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(232,224,212,0.4)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', flexShrink: 0 }}
        >
          x
        </button>
      </div>
      {loading && <div className={styles.cardAddHint}>Searching...</div>}
      {!loading && query.length >= 2 && suggestions.length === 0 && (
        <div className={styles.cardAddHint}>No results</div>
      )}
      {suggestions.length > 0 && (
        <ul className={styles.cardAddList}>
          {suggestions.map((name, i) => (
            <li
              key={name}
              className={`${styles.cardAddItem} ${i === activeIndex ? styles.cardAddItemActive : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => void selectCard(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function parseCardType(typeLine: string): Card['cardType'] {
  if (typeLine.includes('Creature')) return 'creature'
  if (typeLine.includes('Land')) return 'land'
  if (typeLine.includes('Planeswalker')) return 'planeswalker'
  if (typeLine.includes('Artifact')) return 'artifact'
  if (typeLine.includes('Enchantment')) return 'enchantment'
  if (typeLine.includes('Instant')) return 'instant'
  if (typeLine.includes('Sorcery')) return 'sorcery'
  if (typeLine.includes('Battle')) return 'battle'
  return 'artifact'
}