import type { Metadata } from 'next'
import { ScenarioViewer } from '@/components/viewer/ScenarioViewer'

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function getScenarioTitle(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/scenarios/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.title ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const title = await getScenarioTitle(id)
  return { title: title ?? 'Scenario' }
}

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScenarioViewer scenarioId={id} />
}