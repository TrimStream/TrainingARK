import { AppShell } from './AppShell'
import styles from './ContentPage.module.css'

export function ContentPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AppShell>
      <article className={styles.container}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </article>
    </AppShell>
  )
}