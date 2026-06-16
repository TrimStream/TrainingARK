'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Player, PlayerPosition, Card } from '@/types/board'
import styles from './PlayerZone.module.css'

interface PlayerZoneProps {
  player: Player
  position: PlayerPosition
  revealAll?: boolean
}

const CARD_BACK = '/back_magic.png'
const CARD_W = 60
const CARD_H = 84
const HAND_OVERLAP = 28 // px each card shifts right

type ExpandableZone = 'hand' | 'graveyard' | 'exile'

function formatTax(tax: Player['commanderTax']): string {
  if (Array.isArray(tax)) return `Tax: ${tax[0]} / ${tax[1]}`
  return tax > 0 ? `Tax: ${tax}` : ''
}

export function PlayerZone({ player, position, revealAll }: PlayerZoneProps) {
  const [expanded, setExpanded] = useState<ExpandableZone | null>(null)

  const isTop = position === 'top-left' || position === 'top-right'
  const isRight = position === 'top-right' || position === 'bottom-right'

  function toggle(zone: ExpandableZone) {
    setExpanded(prev => prev === zone ? null : zone)
  }

  function zoneCount(zoneName: keyof Player['zones']): number {
    const zone = player.zones[zoneName]
    return zone.cardCount ?? zone.cards.length
  }

  function cardSrc(card: Card, revealed: boolean): string {
    return revealed && card.imageUrl ? card.imageUrl : CARD_BACK
  }

  // Hand: overlapping fan of cards
  const handCount = zoneCount('hand')
  const handRevealed = revealAll || player.zones.hand.revealed
  const handCards = player.zones.hand.cards

  function renderHand() {
    const count = handRevealed && handCards.length > 0 ? handCards.length : handCount
    const totalWidth = CARD_W + (count - 1) * HAND_OVERLAP

    return (
      <div
        className={styles.handFan}
        style={{ width: Math.max(totalWidth, CARD_W) }}
        onClick={() => toggle('hand')}
      >
        {handRevealed && handCards.length > 0
          ? handCards.map((card, i) => (
              <div
                key={card.id}
                className={styles.fanCard}
                style={{ left: i * HAND_OVERLAP }}
              >
                <Image src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, display: 'block', width: CARD_W, height: CARD_H }} />
              </div>
            ))
          : Array.from({ length: count }).map((_, i) => (
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
      return (
        <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
      )
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
    const cards = player.zones.command.cards
    if (cards.length === 0) {
      return <div className={styles.emptyPile} style={{ width: CARD_W, height: CARD_H }} />
    }
    return (
      <div style={{ position: 'relative', width: cards.length === 1 ? CARD_W : CARD_W + 16, height: CARD_H }}>
        {cards.map((card, i) => (
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
        {expanded === 'hand' ? `Hand (${handCount})` : expanded === 'graveyard' ? `Graveyard (${zoneCount('graveyard')})` : `Exile (${zoneCount('exile')})`}
        <button className={styles.closeExpanded} onClick={() => setExpanded(null)}>x</button>
      </div>
      <div className={styles.expandedCards}>
        {expanded === 'hand' && (
          handRevealed && handCards.length > 0
            ? handCards.map(card => (
                <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
              ))
            : Array.from({ length: handCount }).map((_, i) => (
                <Image key={i} src={CARD_BACK} alt="Card back" width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
              ))
        )}
        {expanded === 'graveyard' && player.zones.graveyard.cards.map(card => (
          <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
        ))}
        {expanded === 'exile' && player.zones.exile.cards.map(card => (
          <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, flexShrink: 0, width: CARD_W, height: CARD_H }} />
        ))}
      </div>
    </div>
  )

  const rightSideZones = (
      <>
        {/* Hand takes remaining space */}
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
        <div className={styles.playerMeta}>
          <span className={styles.playerName}>{player.name}</span>
          <span className={styles.playerLife}>{player.life}</span>
          {formatTax(player.commanderTax) && (
            <span className={styles.playerTax}>{formatTax(player.commanderTax)}</span>
          )}
        </div>
        <div className={styles.stripDivider} />
        {isRight ? rightSideZones : leftSideZones}
      </div>
    )

  const battlefield = player.zones.battlefield.cards
  const creatures = battlefield.filter(c => c.cardType === 'creature')
  const nonlands = battlefield.filter(c =>
    c.cardType === 'artifact' || c.cardType === 'enchantment' || c.cardType === 'planeswalker'
  )
  const lands = battlefield.filter(c => c.cardType === 'land')

  const sections = [
    <div key="creatures" className={styles.section}>
      {creatures.map(card => (
        <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, width: CARD_W, height: CARD_H }} />
      ))}
    </div>,
    <div key="nonlands" className={styles.section}>
      {nonlands.map(card => (
        <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, width: CARD_W, height: CARD_H }} />
      ))}
    </div>,
    <div key="lands" className={styles.section}>
      {lands.map(card => (
        <Image key={card.id} src={cardSrc(card, true)} alt={card.name} width={CARD_W} height={CARD_H} style={{ borderRadius: 4, width: CARD_W, height: CARD_H }} />
      ))}
    </div>,
  ]

  return (
    <div className={styles.playmat}>
      {isTop && expandedPanel}
      {isTop && strip}
      <div className={styles.battlefield}>
        <Image src="/tark-dark.png" alt="" fill className={styles.watermark} />
        {isTop ? [...sections].reverse() : sections}
      </div>
      {!isTop && strip}
      {!isTop && expandedPanel}
    </div>
  )
}