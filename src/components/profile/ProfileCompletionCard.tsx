'use client'

import { useRouter } from 'next/navigation'

// Temporary placeholder component while we fix the automation
export function ProfileCompletionCard() {
  const router = useRouter()
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-2">Profile Completion</h3>
      <p className="text-gray-600 mb-4">Complete your profile to enable automation features.</p>
      <button 
        onClick={() => router.push('/profile')}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Update Profile
      </button>
    </div>
  )
}

export default ProfileCompletionCard