'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import DashboardLayout from '@/app/dashboard/DashboardLayout'
import TeacherDashboard from '@/app/dashboard/TeacherDashboard'
import ParentDashboard from '@/app/dashboard/ParentDashboard'
import StudentDashboard from '@/app/dashboard/StudentDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'teacher' | 'parent' | 'student'
}

export default function UnifiedDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to get session')
          router.push('/')
          return
        }

        if (!session) {
          console.log('No session found')
          router.push('/')
          return
        }

        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          setError('Failed to load user profile')
          return
        }

        if (!profile) {
          console.log('No profile found')
          router.push('/')
          return
        }

        // Validate role is one of the expected types
        const validRoles: Array<'teacher' | 'parent' | 'student'> = ['teacher', 'parent', 'student']
        const userRole = profile.role as 'teacher' | 'parent' | 'student'
        
        if (!validRoles.includes(userRole)) {
          console.error('Invalid role:', profile.role)
          setError(`Invalid user role: ${profile.role}`)
          return
        }

        // Set user data - using full_name from database schema
        setUser({
          id: profile.id,
          email: session.user.email || '',
          name: profile.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          avatar_url: profile.avatar_url || session.user.user_metadata?.avatar_url,
          role: userRole
        })

      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go Home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No user state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to access your dashboard</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render role-specific dashboard content
  const renderDashboardContent = () => {
    switch (user.role) {
      case 'teacher':
        return <TeacherDashboard user={user} />
      case 'parent':
        return <ParentDashboard user={user} />
      case 'student':
        return <StudentDashboard user={user} />
      default:
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❓</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unknown Role</h2>
              <p className="text-gray-600 mb-4">
                Your account role ({user.role}) is not recognized. Please contact support.
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Go Home
              </button>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <DashboardLayout user={user}>
      {renderDashboardContent()}
    </DashboardLayout>
  )
}