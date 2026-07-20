import { ScenarioViewer } from '@/components/viewer/ScenarioViewer'

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScenarioViewer scenarioId={id} />
}