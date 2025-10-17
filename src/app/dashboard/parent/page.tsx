// app/dashboard/parent/page.tsx
import dynamic from 'next/dynamic'

// Force dynamic rendering to avoid build-time Supabase issues
export const dynamic = 'force-dynamic'

const UnifiedDashboard = dynamic(() => import('@/app/dashboard/UnifiedDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
})

export default function ParentDashboardPage() {
  return <UnifiedDashboard />
}
