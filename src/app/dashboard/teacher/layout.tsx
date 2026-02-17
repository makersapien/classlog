'use client'

import React, { createContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '../DashboardLayout'
import { DashboardLayoutContext } from '@/contexts/DashboardLayoutContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'teacher' | 'parent' | 'student'
}

// Create user context for teacher sub-pages
const TeacherUserContext = createContext<User | null>(null)

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()


  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 Teacher layout: Checking authentication...')
        
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

        console.log('✅ Session found for user:', session.user.id)

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

        // Check if user is a teacher
        if (profile.role !== 'teacher') {
          console.log('User is not a teacher:', profile.role)
          router.push(`/dashboard/${profile.role}`)
          return
        }

        console.log('✅ Teacher profile loaded:', profile.full_name)

        // Set user data
        setUser({
          id: profile.id as string,
          email: session.user.email || '',
          name: (profile.full_name as string) || session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Teacher',
          avatar_url: (profile.avatar_url as string) || session.user.user_metadata?.avatar_url,
          role: profile.role as 'teacher'
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

          <div className="text-center">
            <p className="text-gray-500">Loading teacher dashboard...</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
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
            <p className="text-gray-600 mb-4">Please sign in to access the teacher dashboard</p>
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

  // All teacher pages should have the sidebar - wrap everything in DashboardLayout
  return (
    <DashboardLayout user={user}>
      <DashboardLayoutContext.Provider value={true}>
        <TeacherUserContext.Provider value={user}>
          {children}
        </TeacherUserContext.Provider>
      </DashboardLayoutContext.Provider>
    </DashboardLayout>
  )
}
