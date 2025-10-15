// src/app/dashboard/teacher/classes/page.tsx
// Fixed to use the same auth pattern as your dashboard

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import MyClassesView from '@/components/MyClassesView'
import DashboardLayout from '@/app/dashboard/DashboardLayout'

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'teacher' | 'parent' | 'student'
}

export default function MyClassesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoadUser = async () => {
      try {
        console.log('🔍 Checking authentication...')
        
        // Create Supabase client inside useEffect to avoid build-time env var issues
        const supabase = createClientComponentClient()
        
        // Get the current session (same pattern as your dashboard)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Session error')
          router.push('/')
          return
        }

        if (!session) {
          console.log('No session found')
          setError('No session found')
          router.push('/')
          return
        }

        console.log('✅ Session found for user:', session.user.id)

        // Get user profile from database (same as dashboard)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          setError('Profile error')
          router.push('/')
          return
        }

        if (!profile) {
          console.log('No profile found')
          setError('No profile found')
          router.push('/')
          return
        }

        // Check if user is a teacher
        if (profile.role !== 'teacher') {
          console.log('User is not a teacher:', profile.role)
          setError('Access denied - teachers only')
          router.push(`/dashboard/${profile.role}`)
          return
        }

        console.log('✅ Teacher profile loaded:', profile.full_name)

        // Set user data
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile.full_name || 'Teacher',
          avatar_url: profile.avatar_url,
          role: profile.role
        })

      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Unexpected error occurred')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your classes...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Unable to load user data'}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  // Render with your existing DashboardLayout
  return (
    <DashboardLayout user={user}>
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

        {/* Classes view */}
        <MyClassesView teacherId={user.id} />
      </div>
    </DashboardLayout>
  )
}