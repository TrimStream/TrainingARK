import Link from 'next/link'
import { ContentPage } from '@/components/shell/ContentPage'
import styles from '@/components/shell/ContentPage.module.css'

export default function NotFound() {
  return (
    <ContentPage title="404">
      <p className={styles.body}>
        That page does not exist. It may have been moved, or the link may be wrong.
      </p>
      <p className={styles.body}>
        <Link href="/" style={{ color: '#c9a84c', textDecoration: 'none' }}>
          Back to home
        </Link>
      </p>
    </ContentPage>
  )
}