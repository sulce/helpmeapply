import { InterviewPageClient } from './client'

interface InterviewPageProps {
  params: Promise<{
    sessionId: string
  }>
}

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { sessionId } = await params

  return <InterviewPageClient sessionId={sessionId} />
}