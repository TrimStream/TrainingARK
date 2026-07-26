import { SearchResults } from '@/components/search/SearchResults'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Search' }

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  // Next 16: searchParams is a promise. Repeated ?q= params arrive as an
  // array; take the first so /search?q=a&q=b is a normal search, not a crash.
  const { q } = await props.searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? ''

  return <SearchResults query={query} />
}
