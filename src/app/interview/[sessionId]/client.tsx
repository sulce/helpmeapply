'use client'

import { useRouter } from 'next/navigation'
import { InterviewSession } from '@/components/interview/InterviewSession'

interface InterviewPageClientProps {
  sessionId: string
}

export function InterviewPageClient({ sessionId }: InterviewPageClientProps) {
  const router = useRouter()

  const handleInterviewComplete = () => {
    // Redirect to dashboard or applications page after completion
    router.push('/dashboard?tab=applications&completed=interview')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <InterviewSession 
          sessionId={sessionId}
          onComplete={handleInterviewComplete}
        />
      </div>
    </div>
  )
}