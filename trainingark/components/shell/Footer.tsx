import Link from 'next/link'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.columns}>
        <div className={styles.column}>
          <span className={styles.columnTitle}>TrainingARK</span>
          <Link href="/about">About</Link>
          <Link href="/rules">Rules &amp; Banlist</Link>
          <Link href="/tutorial">Tutorial</Link>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Tournaments &amp; Stats</span>
          <a href="https://topdeck.gg" target="_blank" rel="noreferrer">topdeck.gg</a>
          <a href="https://cedhstats.org" target="_blank" rel="noreferrer">cedhstats.org</a>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Deckbuilding</span>
          <a href="https://moxfield.com" target="_blank" rel="noreferrer">Moxfield</a>
          <a href="https://archidekt.com" target="_blank" rel="noreferrer">Archidekt</a>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Find out more</span>
          <a href="https://magic.wizards.com" target="_blank" rel="noreferrer">Magic: The Gathering</a>
          <span className={styles.disabled} title="Coming soon">Discord</span>
        </div>
      </div>

      <div className={styles.credit}>
        <span>
          Built by Eshaan Singh ·{' '}
          <a href="https://moxfield.com/users/TrimStream" target="_blank" rel="noreferrer">Moxfield</a>
          {' · '}
          <a href="https://github.com/TrimStream" target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </div>

      <div className={styles.legal}>
        <span>© 2026 TrainingARK. Not affiliated with Wizards of the Coast.</span>
      </div>
    </footer>
  )
}