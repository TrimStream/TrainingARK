'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Player, PlayerPosition, Card, StackItem } from '@/types/board'
import { ViewerCard } from './ViewerCard'
import styles from './ViewerBoard.module.css'

const CARD_BACK = '/back_magic.png'
const CARD_W = 80
const CARD_H = 112
const HAND_OVERLAP = 36

function zoneCount(p: Player, zone: keyof Player['zones']): number {
  const z = p.zones[zone]
  return z.cardCount ?? z.cards.length
}

function formatTax(tax: Player['commanderTax']): string {
  if (Array.isArray(tax)) return `Tax: ${tax[0]} / ${tax[1]}`
  return `Tax: ${tax}`
}

type ExpandableZone = 'hand' | 'graveyard' | 'exile'

function ViewerPlayerZone({ player, position, isPlayerSeat }: {
  player: Player
  position: PlayerPosition
  isPlayerSeat: boolean
}) {
  const [expanded, setExpanded] = useState<ExpandableZone | null>(null)

  const isTop = position === 'top-left' || position === 'top-right'
  const isRight = position === 'top-right' || position === 'bottom-right'

  const handCount = zoneCount(player, 'hand')
  const handRevealed = isPlayerSeat || player.zones.hand.revealed
  const handCards = player.zones.hand.cards

  function toggle(zone: ExpandableZone) {
    setExpanded(prev => prev === zone ? null : zone)
  }

  function renderHand() {
    const count = handRevealed && handCards.length > 0 ? handCards.length : handCount
    return (
      <div className={styles.handFan} onClick={() => handRevealed && toggle('hand')}>
        {handRevealed && handCards.length > 0
          ? handCards.map((card: Card, i: number) => (
              <div key={card.id} className={styles.fanCard} style={{ left: i * HAND_OVERLAP }}>
                <ViewerCard card={card} width={CARD_W} height={CARD_H} />
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

  function renderPile(cards: Card[], count: number) {
    if (count === 0) return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    const topCard = cards[cards.length - 1]
    if (!topCard) {
      return <Image src={CARD_BACK} alt="Pile" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
    }
    return <ViewerCard card={topCard} width={CARD_W} height={CARD_H} />
  }

  function renderLibrary() {
    const count = zoneCount(player, 'library')
    if (count === 0) return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    return <Image src={CARD_BACK} alt="Library" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
  }

  function renderCommandZone() {
    const cards = player.zones.command.cards
    if (cards.length === 0) return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    return (
      <div className={styles.commandWrap} style={{ width: cards.length === 1 ? CARD_W : CARD_W + 16 }}>
        {cards.map((card: Card, i: number) => (
          <div key={card.id} className={styles.commandCardSlot} style={{ left: i * 16, zIndex: i }}>
            <ViewerCard card={card} width={CARD_W} height={CARD_H} />
          </div>
        ))}
      </div>
    )
  }

  function zoneHeader(label: string, count: number | null, expandKey: ExpandableZone | null, clickable: boolean) {
    return (
      <div className={styles.zoneLabelRow}>
        <span
          className={`${styles.zoneLabelText} ${clickable ? styles.zoneLabelClickable : ''}`}
          onClick={() => clickable && expandKey && toggle(expandKey)}
        >
          {label}{count !== null ? ` (${count})` : ''}
        </span>
      </div>
    )
  }

  const handSection = (
    <div className={styles.zoneSection} style={{ flex: 1, minWidth: 0 }}>
      {zoneHeader('Hand', handCount, 'hand', handRevealed)}
      {renderHand()}
    </div>
  )

  const librarySection = (
    <div className={styles.zoneSection}>
      {zoneHeader('Library', zoneCount(player, 'library'), null, false)}
      {renderLibrary()}
    </div>
  )

  const graveyardSection = (
    <div className={styles.zoneSection}>
      {zoneHeader('Graveyard', zoneCount(player, 'graveyard'), 'graveyard', true)}
      {renderPile(player.zones.graveyard.cards, zoneCount(player, 'graveyard'))}
    </div>
  )

  const exileSection = (
    <div className={styles.zoneSection}>
      {zoneHeader('Exile', zoneCount(player, 'exile'), 'exile', true)}
      {renderPile(player.zones.exile.cards, zoneCount(player, 'exile'))}
    </div>
  )

  const commandSection = (
    <div className={styles.zoneSection}>
      {zoneHeader('Command', null, null, false)}
      {renderCommandZone()}
    </div>
  )

  const div = <div className={styles.stripDivider} />

  const playerMetaBlock = (
    <div className={styles.playerMeta}>
      <span className={styles.playerName}>{player.name}</span>
      <span className={styles.playerLife}>{player.life}</span>
      <span className={styles.playerTax}>{formatTax(player.commanderTax)}</span>
    </div>
  )

  const rightSideZones = (
    <>
      {handSection}{div}
      {librarySection}{div}
      {graveyardSection}{div}
      {exileSection}{div}
      {commandSection}
    </>
  )

  const leftSideZones = (
    <>
      {commandSection}{div}
      {exileSection}{div}
      {graveyardSection}{div}
      {librarySection}{div}
      {handSection}
    </>
  )

  const strip = (
    <div className={`${styles.strip} ${isTop ? styles.stripTop : ''}`}>
      {isRight && <>{playerMetaBlock}<div className={styles.stripDivider} /></>}
      {isRight ? rightSideZones : leftSideZones}
      {!isRight && <><div className={styles.stripDivider} />{playerMetaBlock}</>}
    </div>
  )

  const battlefield = player.zones.battlefield.cards
  const creatures = battlefield.filter((c: Card) => c.cardType === 'creature')
  const nonlands = battlefield.filter((c: Card) =>
    c.cardType === 'artifact' || c.cardType === 'enchantment' || c.cardType === 'planeswalker'
  )
  const lands = battlefield.filter((c: Card) => c.cardType === 'land')

  const sections = [
    <div key="c" className={styles.section}>{creatures.map(c => <ViewerCard key={c.id} card={c} width={CARD_W} height={CARD_H} />)}</div>,
    <div key="n" className={styles.section}>{nonlands.map(c => <ViewerCard key={c.id} card={c} width={CARD_W} height={CARD_H} />)}</div>,
    <div key="l" className={styles.section}>{lands.map(c => <ViewerCard key={c.id} card={c} width={CARD_W} height={CARD_H} />)}</div>,
  ]

  const expandedCards = expanded
    ? (expanded === 'hand' ? (handRevealed ? handCards : []) : player.zones[expanded].cards)
    : []

  const expandedPanel = expanded && (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedHeader}>
        <span>Viewing {expanded[0].toUpperCase() + expanded.slice(1)}</span>
        <button className={styles.closeExpanded} onClick={() => setExpanded(null)}>×</button>
      </div>
      <div className={styles.expandedList}>
        {expandedCards.length === 0 && <p className={styles.emptyZoneText}>No cards here.</p>}
        {[...expandedCards].reverse().map(card => (
          <ViewerExpandedRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.playmat}>
      {isTop && (
        <div className={styles.stripWrap}>
          {strip}
          {expanded && <div className={styles.expandedAnchorBottom}>{expandedPanel}</div>}
        </div>
      )}

      <div className={styles.battlefield}>
        {isTop ? [...sections].reverse() : sections}
      </div>

      {!isTop && (
        <div className={styles.stripWrap}>
          {expanded && <div className={styles.expandedAnchorTop}>{expandedPanel}</div>}
          {strip}
        </div>
      )}
    </div>
  )
}

function ViewerExpandedRow({ card }: { card: Card }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={styles.expandedRow}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={styles.expandedRowName}>{card.name}</span>
      {hovered && card.imageUrl && (
        <div className={styles.preview}>
          <Image src={card.imageUrl} alt={card.name} width={240} height={336} style={{ borderRadius: 8, display: 'block' }} />
        </div>
      )}
    </div>
  )
}

export function ViewerBoard({ players, stack }: {
  players: [Player, Player, Player, Player]
  stack: StackItem[]
}) {
  return (
    <div className={styles.grid}>
      <ViewerPlayerZone player={players[2]} position="top-left" isPlayerSeat={false} />
      <ViewerPlayerZone player={players[3]} position="top-right" isPlayerSeat={false} />
      <ViewerPlayerZone player={players[1]} position="bottom-left" isPlayerSeat={false} />
      <ViewerPlayerZone player={players[0]} position="bottom-right" isPlayerSeat={true} />

      {stack.length > 0 && (
        <div className={styles.stackZone}>
          <div className={styles.stackLabel}>Stack ({stack.length})</div>
          {[...stack].reverse().map(item => (
            <div key={item.id} className={styles.stackItem}>
              <span className={styles.stackType}>
                {item.type === 'cast' ? '✦' : item.type === 'triggered' ? '⟳' : '⚡'}
              </span>
              <span className={styles.stackName}>{item.sourceCardName}</span>
              <span className={styles.stackController}>{item.controller}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}