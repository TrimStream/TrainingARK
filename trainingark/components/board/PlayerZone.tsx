'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { Player, PlayerPosition, Card } from '@/types/board'
import styles from './PlayerZone.module.css'
import { BoardCard } from './BoardCard'
import type { ZoneTarget, StackType } from './CardContextMenu'
import { ZoneMenu, type ZoneMenuItem } from './ZoneMenu'
import { CommanderSetupModal } from './CommanderSetupModal'
import { useBuilderStore, type EditableZone } from '@/store/builderStore'

interface PlayerZoneProps {
  playerIndex: number
  position: PlayerPosition
  revealAll?: boolean
}

const CARD_BACK = '/back_magic.png'
const CARD_W = 80
const CARD_H = 112
const HAND_OVERLAP = 36

type ExpandableZone = 'hand' | 'graveyard' | 'exile' | 'library'

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
	command: 'command',
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

export function cleanDecklistLine(rawLine: string): string {
  let line = rawLine.trim()
  line = line.replace(/^\d+\s+/, '')
  line = line.replace(/\s+\([A-Za-z0-9]{2,6}\).*$/, '')
  return line.trim()
}

export function PlayerZone({ playerIndex, position, revealAll }: PlayerZoneProps) {
  const {
    players, updatePlayer, confirmSetup, setupComplete,
    moveCard, addCard, castToStack, setLife, setTax, setTaxPartner,
    decklists, drawCard, shuffleLibrary, removeCard, createTokenCopy,
    incrementToken, decrementToken,
    isDuplicate, dismissDuplicateWarning, dismissedDuplicateWarnings,
  } = useBuilderStore()

  const player = players?.[playerIndex]
  const isSetupDone = setupComplete[playerIndex]
  const decklist = decklists[playerIndex]

  const [expanded, setExpanded] = useState<ExpandableZone | null>(null)
  const [filterText, setFilterText] = useState('')
  const [showCardSearch, setShowCardSearch] = useState<{ zone: EditableZone; tokensOnly?: boolean } | null>(null)
  const [cardSearchRect, setCardSearchRect] = useState<DOMRect | null>(null)
  const [editingLife, setEditingLife] = useState(false)
  const [lifeInput, setLifeInput] = useState('')
  const [editingTax, setEditingTax] = useState<0 | 1 | null>(null)
  const [taxInput, setTaxInput] = useState('')
  const [zoneMenu, setZoneMenu] = useState<{ x: number; y: number; items: ZoneMenuItem[] } | null>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const handAddBtnRef = useRef<HTMLButtonElement>(null)
  const graveyardAddBtnRef = useRef<HTMLButtonElement>(null)
  const exileAddBtnRef = useRef<HTMLButtonElement>(null)
  const libraryAddBtnRef = useRef<HTMLButtonElement>(null)

  const isTop = position === 'top-left' || position === 'top-right'
  const isRight = position === 'top-right' || position === 'bottom-right'

  function toggle(zone: ExpandableZone) {
    setFilterText('')
    setExpanded(prev => prev === zone ? null : zone)
  }

  function zoneCount(zoneName: keyof Player['zones']): number {
    if (!player) return 0
    const zone = player.zones[zoneName]
    return zone.cardCount ?? zone.cards.length
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

  function handleRemove(cardId: string) {
    removeCard(playerIndex, cardId)
  }

  function handleTokenCopy(cardId: string) {
    createTokenCopy(playerIndex, cardId)
  }

  function handleAddCard(zone: EditableZone, rect: DOMRect, tokensOnly?: boolean) {
    setShowCardSearch({ zone, tokensOnly })
    setCardSearchRect(rect)
  }

  function handleCardSelected(card: Card) {
    if (!showCardSearch) return
    const { zone } = showCardSearch
    if (decklist.length > 0 && !decklist.includes(card.name) && !card.isToken) return
    addCard(playerIndex, zone, card)
    setShowCardSearch(null)
    setCardSearchRect(null)
  }

  function handleSetupConfirm(partial: Partial<Player>, _commanderNames: string[], dl: string[]) {
    if (!player) return
    const cleanedDl = dl.map(cleanDecklistLine).filter(Boolean)
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
    confirmSetup(playerIndex, cleanedDl)
  }

  function commitLife() {
    const val = parseInt(lifeInput)
    if (!isNaN(val)) setLife(playerIndex, val)
    setEditingLife(false)
  }

  function commitTax() {
    if (!player) return
    const val = parseInt(taxInput)
    if (isNaN(val) || editingTax === null) { setEditingTax(null); return }
    if (Array.isArray(player.commanderTax)) {
      setTaxPartner(playerIndex, editingTax, val)
    } else {
      setTax(playerIndex, val)
    }
    setEditingTax(null)
  }

  function moveAllFromZone(fromZone: EditableZone, toZone: EditableZone) {
    if (!player) return
    const cards = [...player.zones[fromZone].cards]
    cards.forEach(card => moveCard(playerIndex, card.id, fromZone, toZone))
  }

  function discardRandom() {
    if (!player) return
    const cards = player.zones.hand.cards
    if (cards.length === 0) return
    const card = cards[Math.floor(Math.random() * cards.length)]
    moveCard(playerIndex, card.id, 'hand', 'graveyard')
  }

  function openZoneMenu(e: React.MouseEvent, items: ZoneMenuItem[]) {
    e.stopPropagation()
    setZoneMenu({ x: e.clientX, y: e.clientY, items })
  }

  function openOuterMenu(e: React.MouseEvent) {
    e.stopPropagation()
    const items: ZoneMenuItem[] = [
      { label: 'Search Library', action: () => toggle('library') },
      { label: 'Shuffle Library', action: () => shuffleLibrary(playerIndex) },
      { label: 'Draw', action: () => drawCard(playerIndex) },
      {
        label: 'Add Token', action: () => {
          const rect = addBtnRef.current?.getBoundingClientRect()
          if (rect) handleAddCard('battlefield', rect, true)
        },
      },
    ]
    setZoneMenu({ x: e.clientX, y: e.clientY, items })
  }

  if (!player) return null
  const p: Player = player

  const handCount = zoneCount('hand')
  const handRevealed = revealAll || p.zones.hand.revealed
  const handCards = p.zones.hand.cards

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
              <div key={card.id} className={styles.fanCard} style={{ left: i * HAND_OVERLAP }} onClick={e => e.stopPropagation()}>
                <BoardCard
                  card={card}
                  onMove={t => handleMove(card.id, t)}
                  onCastToStack={t => handleCastToStack(card.id, t)}
                  onRemove={() => handleRemove(card.id)}
                  showRemoveX
                  currentZone="hand"
                />
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

  function renderPile(cards: Card[], count: number, revealed: boolean, zone: EditableZone) {
    if (count === 0) {
      return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    }
    const topCard = cards[cards.length - 1]
    if (!topCard) {
      return (
        <div style={{ width: CARD_W, height: CARD_H }}>
          <Image src={CARD_BACK} alt="top card" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
        </div>
      )
    }
    return (
      <div onClick={e => e.stopPropagation()}>
        <BoardCard
          card={revealed ? topCard : { ...topCard, imageUrl: undefined }}
          onMove={t => handleMove(topCard.id, t)}
          onCastToStack={t => handleCastToStack(topCard.id, t)}
          onRemove={() => handleRemove(topCard.id)}
          showRemoveX
          currentZone={zone}
        />
      </div>
    )
  }

  function renderCommandZone() {
    const cards = p.zones.command.cards
    if (cards.length === 0) {
      return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    }
    return (
      <div className={styles.commandWrap} style={{ width: cards.length === 1 ? CARD_W : CARD_W + 16 }}>
        {cards.map((card: Card, i: number) => (
          <div key={card.id} className={styles.commandCardSlot} style={{ left: i * 16, zIndex: i }}>
            <BoardCard
              card={card}
              onMove={t => handleMove(card.id, t)}
              onCastToStack={t => handleCastToStack(card.id, t)}
              currentZone="command"
            />
          </div>
        ))}
      </div>
    )
  }

  function getExpandedCards(): Card[] {
    if (!expanded) return []
    if (expanded === 'hand') return handRevealed ? handCards : []
    return p.zones[expanded].cards
  }

  const expandedCardsRaw = getExpandedCards()
  const expandedCards = filterText
    ? expandedCardsRaw.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()))
    : expandedCardsRaw

  const expandedPanel = expanded && (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedHeader}>
        <span>Viewing {expanded[0].toUpperCase() + expanded.slice(1)}</span>
        <button className={styles.closeExpanded} onClick={() => setExpanded(null)}>×</button>
      </div>

      <div className={styles.expandedList}>
        {expandedCards.length === 0 && (
          <p className={styles.emptyZoneText}>No cards here.</p>
        )}
        {[...expandedCards].reverse().map(card => (
          <ExpandedRow
            key={card.id}
            card={card}
            onMove={t => handleMove(card.id, t)}
            onCastToStack={t => handleCastToStack(card.id, t)}
            onRemove={() => handleRemove(card.id)}
            onCreateTokenCopy={() => handleTokenCopy(card.id)}
            onIncrement={card.isToken ? () => incrementToken(playerIndex, card.id) : undefined}
            onDecrement={card.isToken ? () => decrementToken(playerIndex, card.id) : undefined}
            currentZone={expanded}
          />
        ))}
      </div>

      <input
        className={styles.expandedFilter}
        placeholder="Filter..."
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
        onClick={e => e.stopPropagation()}
      />
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
      onClick={() => { setLifeInput(String(p.life)); setEditingLife(true) }}
      title="Click to edit"
    >
      {p.life}
    </span>
  )

  const isPartner = Array.isArray(p.commanderTax)

  function renderTax() {
    if (!isPartner) {
      if (editingTax === 0) {
        return (
          <input
            className={styles.inlineInput}
            type="number"
            value={taxInput}
            onChange={e => setTaxInput(e.target.value)}
            onBlur={commitTax}
            onKeyDown={e => { if (e.key === 'Enter') commitTax(); if (e.key === 'Escape') setEditingTax(null) }}
            autoFocus
          />
        )
      }
      return (
        <span
          className={styles.playerTax}
          onClick={() => { setTaxInput(String(p.commanderTax)); setEditingTax(0) }}
          title="Click to edit"
        >
          {formatTax(p.commanderTax)}
        </span>
      )
    }

    const taxArr = p.commanderTax as [number, number]
    const t0 = taxArr[0]
    const t1 = taxArr[1]
    return (
      <span className={styles.playerTax}>
        Tax:{' '}
        {editingTax === 0 ? (
          <input
            className={styles.inlineInput}
            type="number"
            value={taxInput}
            onChange={e => setTaxInput(e.target.value)}
            onBlur={commitTax}
            onKeyDown={e => { if (e.key === 'Enter') commitTax(); if (e.key === 'Escape') setEditingTax(null) }}
            autoFocus
          />
        ) : (
          <span onClick={() => { setTaxInput(String(t0)); setEditingTax(0) }} style={{ cursor: 'pointer' }} title="Click to edit">{t0}</span>
        )}
        {' / '}
        {editingTax === 1 ? (
          <input
            className={styles.inlineInput}
            type="number"
            value={taxInput}
            onChange={e => setTaxInput(e.target.value)}
            onBlur={commitTax}
            onKeyDown={e => { if (e.key === 'Enter') commitTax(); if (e.key === 'Escape') setEditingTax(null) }}
            autoFocus
          />
        ) : (
          <span onClick={() => { setTaxInput(String(t1)); setEditingTax(1) }} style={{ cursor: 'pointer' }} title="Click to edit">{t1}</span>
        )}
      </span>
    )
  }

  const playerMetaBlock = (
    <div className={styles.playerMeta}>
      <span className={styles.playerName}>{p.name}</span>
      {lifeDisplay}
      {renderTax()}
    </div>
  )

  function zoneHeader(
    label: string,
    count: number,
    expandKey: ExpandableZone | null,
    menuItems: ZoneMenuItem[],
    addRef?: React.RefObject<HTMLButtonElement | null>,
    onAdd?: () => void,
  ) {
    return (
      <div className={styles.zoneLabelRow}>
        <span className={styles.zoneLabelText} onClick={() => expandKey && toggle(expandKey)}>
          {label} ({count})
        </span>
        {onAdd && (
          <button ref={addRef} className={styles.zoneAddBtn} onClick={e => { e.stopPropagation(); onAdd() }} title={`Add card to ${label}`}>+</button>
        )}
        <button className={styles.zoneArrow} onClick={e => openZoneMenu(e, menuItems)}>▼</button>
      </div>
    )
  }

  const rightSideZones = (
    <>
      <div className={styles.zoneSection} style={{ flex: 1, minWidth: 0 }}>
        {zoneHeader('Hand', handCount, 'hand', [
          { label: 'Move all to Library', action: () => moveAllFromZone('hand', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('hand', 'library') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('hand', 'graveyard') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('hand', 'exile') },
          { label: 'Discard a Card Randomly', action: discardRandom, danger: true },
        ], handAddBtnRef, () => { const r = handAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('hand', r) })}
        {renderHand()}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Library', zoneCount('library'), 'library', [
          { label: 'View Top Card', action: () => toggle('library') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('library', 'graveyard') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('library', 'exile') },
          { label: 'Shuffle', action: () => shuffleLibrary(playerIndex) },
        ], libraryAddBtnRef, () => { const r = libraryAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('library', r) })}
        <div
          style={{ cursor: zoneCount('library') > 0 ? 'pointer' : 'default' }}
          onClick={() => { if (zoneCount('library') > 0) drawCard(playerIndex) }}
          title={zoneCount('library') > 0 ? 'Click to draw' : ''}
        >
          {zoneCount('library') > 0 ? (
            <Image src={CARD_BACK} alt="Library" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
          ) : (
            <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
          )}
        </div>
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Graveyard', zoneCount('graveyard'), 'graveyard', [
          { label: 'View all', action: () => toggle('graveyard') },
          { label: 'Move all to Hand', action: () => moveAllFromZone('graveyard', 'hand') },
          { label: 'Move all to Library', action: () => moveAllFromZone('graveyard', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('graveyard', 'library') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('graveyard', 'exile') },
        ], graveyardAddBtnRef, () => { const r = graveyardAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('graveyard', r) })}
        {renderPile(p.zones.graveyard.cards, zoneCount('graveyard'), true, 'graveyard')}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Exile', zoneCount('exile'), 'exile', [
          { label: 'View all', action: () => toggle('exile') },
          { label: 'Move all to Battlefield', action: () => moveAllFromZone('exile', 'battlefield') },
          { label: 'Move all to Hand', action: () => moveAllFromZone('exile', 'hand') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('exile', 'graveyard') },
          { label: 'Move all to Library', action: () => moveAllFromZone('exile', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('exile', 'library') },
        ], exileAddBtnRef, () => { const r = exileAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('exile', r) })}
        {renderPile(p.zones.exile.cards, zoneCount('exile'), true, 'exile')}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabelRow}>
          <span className={styles.zoneLabelText}>Command</span>
        </div>
        {renderCommandZone()}
      </div>
    </>
  )

  const leftSideZones = (
    <>
      <div className={styles.zoneSection}>
        <div className={styles.zoneLabelRow}>
          <span className={styles.zoneLabelText}>Command</span>
        </div>
        {renderCommandZone()}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Exile', zoneCount('exile'), 'exile', [
          { label: 'View all', action: () => toggle('exile') },
          { label: 'Move all to Battlefield', action: () => moveAllFromZone('exile', 'battlefield') },
          { label: 'Move all to Hand', action: () => moveAllFromZone('exile', 'hand') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('exile', 'graveyard') },
          { label: 'Move all to Library', action: () => moveAllFromZone('exile', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('exile', 'library') },
        ], exileAddBtnRef, () => { const r = exileAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('exile', r) })}
        {renderPile(p.zones.exile.cards, zoneCount('exile'), true, 'exile')}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Graveyard', zoneCount('graveyard'), 'graveyard', [
          { label: 'View all', action: () => toggle('graveyard') },
          { label: 'Move all to Hand', action: () => moveAllFromZone('graveyard', 'hand') },
          { label: 'Move all to Library', action: () => moveAllFromZone('graveyard', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('graveyard', 'library') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('graveyard', 'exile') },
        ], graveyardAddBtnRef, () => { const r = graveyardAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('graveyard', r) })}
        {renderPile(p.zones.graveyard.cards, zoneCount('graveyard'), true, 'graveyard')}
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection}>
        {zoneHeader('Library', zoneCount('library'), 'library', [
          { label: 'View Top Card', action: () => toggle('library') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('library', 'graveyard') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('library', 'exile') },
          { label: 'Shuffle', action: () => shuffleLibrary(playerIndex) },
        ], libraryAddBtnRef, () => { const r = libraryAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('library', r) })}
        <div
          style={{ cursor: zoneCount('library') > 0 ? 'pointer' : 'default' }}
          onClick={() => { if (zoneCount('library') > 0) drawCard(playerIndex) }}
          title={zoneCount('library') > 0 ? 'Click to draw' : ''}
        >
          {zoneCount('library') > 0 ? (
            <Image src={CARD_BACK} alt="Library" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
          ) : (
            <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
          )}
        </div>
      </div>
      <div className={styles.stripDivider} />
      <div className={styles.zoneSection} style={{ flex: 1, minWidth: 0 }}>
        {zoneHeader('Hand', handCount, 'hand', [
          { label: 'Move all to Library', action: () => moveAllFromZone('hand', 'library') },
          { label: 'Move all to Bottom of Library', action: () => moveAllFromZone('hand', 'library') },
          { label: 'Move all to Graveyard', action: () => moveAllFromZone('hand', 'graveyard') },
          { label: 'Move all to Exile', action: () => moveAllFromZone('hand', 'exile') },
          { label: 'Discard a Card Randomly', action: discardRandom, danger: true },
        ], handAddBtnRef, () => { const r = handAddBtnRef.current?.getBoundingClientRect(); if (r) handleAddCard('hand', r) })}
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

  const battlefield = p.zones.battlefield.cards
  const creatures = battlefield.filter((c: Card) => c.cardType === 'creature')
  const nonlands = battlefield.filter((c: Card) =>
    c.cardType === 'artifact' || c.cardType === 'enchantment' || c.cardType === 'planeswalker'
  )
  const lands = battlefield.filter((c: Card) => c.cardType === 'land')

  function renderBattlefieldCard(card: Card) {
    const dup = !card.isToken && isDuplicate(playerIndex, card.name, card.id) && !dismissedDuplicateWarnings.has(card.id)

    return (
      <div key={card.id} className={styles.battlefieldCardWrap}>
        {dup && (
          <div className={styles.duplicateWarning}>
            <span>Duplicate non-token card</span>
            <button onClick={() => dismissDuplicateWarning(card.id)}>Dismiss</button>
          </div>
        )}
        <BoardCard
          card={card}
          onMove={t => handleMove(card.id, t)}
          onCastToStack={t => handleCastToStack(card.id, t)}
          onRemove={() => handleRemove(card.id)}
          onCreateTokenCopy={() => handleTokenCopy(card.id)}
          onIncrement={card.isToken ? () => incrementToken(playerIndex, card.id) : undefined}
          onDecrement={card.isToken ? () => decrementToken(playerIndex, card.id) : undefined}
          showRemoveX
          currentZone="battlefield"
        />
      </div>
    )
  }

  const sections = [
    <div key="creatures" className={styles.section}>
      {creatures.map(renderBattlefieldCard)}
    </div>,
    <div key="nonlands" className={styles.section}>
      {nonlands.map(renderBattlefieldCard)}
    </div>,
    <div key="lands" className={styles.section}>
      {lands.map(renderBattlefieldCard)}
    </div>,
  ]

  const addBtnClass = isTop ? styles.addCardBtnBottom : styles.addCardBtnTop
  const outerSide = isRight ? styles.outerMenuRight : styles.outerMenuLeft

  return (
    <div className={styles.playmat}>
      {!isSetupDone && (
        <CommanderSetupModal
          playerIndex={playerIndex}
          playerName={PLAYER_NAMES[playerIndex]}
          onConfirm={handleSetupConfirm}
        />
      )}

      <button className={`${styles.outerMenuBtn} ${outerSide}`} onClick={openOuterMenu} title="Zone actions">
        ⋮
      </button>

      {isTop && (
        <div className={styles.stripWrap}>
          {strip}
          {expanded && <div className={styles.expandedAnchorBottom}>{expandedPanel}</div>}
        </div>
      )}

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

      {!isTop && (
        <div className={styles.stripWrap}>
          {expanded && <div className={styles.expandedAnchorTop}>{expandedPanel}</div>}
          {strip}
        </div>
      )}

      {showCardSearch && cardSearchRect && (
        <div
          className={styles.searchAnchor}
          style={{
            position: 'fixed',
            top: Math.min(cardSearchRect.bottom + 4, window.innerHeight - 260),
            left: Math.min(Math.max(cardSearchRect.left, 8), window.innerWidth - 240),
            zIndex: 1000,
          }}
        >
          <CardAddSearch
            decklist={decklist}
            tokensOnly={showCardSearch.tokensOnly}
            onSelect={handleCardSelected}
            onClose={() => setShowCardSearch(null)}
          />
        </div>
      )}

      {zoneMenu && (
        <ZoneMenu
          x={zoneMenu.x}
          y={zoneMenu.y}
          items={zoneMenu.items}
          onClose={() => setZoneMenu(null)}
        />
      )}
    </div>
  )
}

function ExpandedRow({ card, onMove, onCastToStack, onRemove, onCreateTokenCopy, onIncrement, onDecrement, currentZone }: {
  card: Card
  onMove: (t: ZoneTarget) => void
  onCastToStack: (t: StackType) => void
  onRemove: () => void
  onCreateTokenCopy?: () => void
  onIncrement?: () => void
  onDecrement?: () => void
  currentZone: EditableZone
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={styles.expandedRow}
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={styles.expandedRowName}>{card.name}</span>
      <BoardCard
        card={card}
        onMove={onMove}
        onCastToStack={onCastToStack}
        onRemove={onRemove}
        onCreateTokenCopy={onCreateTokenCopy}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        currentZone={currentZone}
        compact
      />
      {hovered && card.imageUrl && createPortal(
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9998,
          pointerEvents: 'none',
          borderRadius: 8,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        }}>
          <Image
            src={card.imageUrl}
            alt={card.name}
            width={240}
            height={336}
            style={{ borderRadius: 8, display: 'block' }}
          />
        </div>,
        document.body
      )}
    </div>
  )
}

function CardAddSearch({ decklist, tokensOnly, onSelect, onClose }: {
  decklist: string[]
  tokensOnly?: boolean
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
    if (query.length < 1) { setSuggestions([]); return }

    if (tokensOnly) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(`is:token ${query}`)}&unique=cards`)
          if (!res.ok) { setSuggestions([]); return }
          const data = await res.json()
          setSuggestions((data.data ?? []).slice(0, 8).map((c: { name: string }) => c.name))
          setActiveIndex(-1)
        } catch {
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 200)
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }

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
  }, [query, tokensOnly])

  async function selectCard(name: string) {
    try {
      const url = tokensOnly
        ? `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`is:token !"${name}"`)}&unique=cards`
        : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      const cardData = tokensOnly ? data.data?.[0] : data
      if (!cardData) return
      const card: Card = {
        id: cardData.id,
        name: (() => {
			if (tokensOnly && cardData.card_faces && cardData.name.includes('//')) {
		      const match = cardData.card_faces.find(
		        (f: { name: string }) => f.name.toLowerCase().includes(name.toLowerCase())
		      )
		      return match?.name ?? cardData.name
		    }
		    return cardData.name
		  })(),
        imageUrl: cardData.image_uris?.normal ?? (() => {
          if (!cardData.card_faces) return undefined
          const match = cardData.card_faces.find(
            (f: { name: string }) => f.name.toLowerCase().includes(name.toLowerCase())
          )
          return (match ?? cardData.card_faces[0])?.image_uris?.normal
        })(),
        cardType: parseCardType(cardData.type_line ?? ''),
        isToken: tokensOnly ? true : undefined,
      }
      onSelect(card)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.cardAddSearch}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <input
          className={styles.cardAddInput}
          placeholder={tokensOnly ? 'Search tokens...' : decklist.length > 0 ? 'Search decklist...' : 'Search all cards...'}
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
          ×
        </button>
      </div>
      {loading && <div className={styles.cardAddHint}>Searching...</div>}
      {!loading && query.length >= 1 && suggestions.length === 0 && (
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