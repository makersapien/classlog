// src/app/dashboard/teacher/classes/page.tsx
// Fixed to use the same auth pattern as your dashboard

'use client'

import dynamic from 'next/dynamic'
import { useUser } from '@/app/dashboard/DashboardLayout'

// Dynamically import MyClassesView to avoid SSR issues
const MyClassesView = dynamic(() => import('@/components/MyClassesView'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
})

export default function MyClassesPage() {
  // Get user from the DashboardLayout context
  const user = useUser()
  
  return (
    <div className="space-y-6">
        {/* Success banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-emerald-600 mr-2">🎉</span>
          <div>
            <h3 className="font-medium text-emerald-800">Auto-Detection Active!</h3>
            <p className="text-sm text-emerald-700">
              Google Meet classes are being automatically tracked. Your Excel days are over!
            </p>
          </div>
        </div>
      </div>

      {/* Classes view with teacherId from user context */}
      <MyClassesView teacherId={user.id} />
    </div>
  )
}