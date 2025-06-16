// src/app/onboarding/success/page.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function OnboardingSuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-green-500 text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Enrollment Complete!</h1>
        <p className="text-gray-600 mb-8">
          Your enrollment has been successfully processed. You will receive further instructions via email shortly.
        </p>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Next steps:
          </p>
          <ul className="text-sm text-gray-600 text-left space-y-2">
            <li>• Check your email for login credentials</li>
            <li>• Join the WhatsApp group for updates</li>
            <li>• Attend your first class as scheduled</li>
          </ul>
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-8 w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
        >
          Return to Homepage
        </button>
      </div>
    </div>
  )
}