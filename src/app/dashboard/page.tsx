'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Checking authentication...')

  useEffect(() => {
    const redirectToRoleDashboard = async () => {
      try {
        setStatus('🔄 Checking authentication...')
        
        // Use the working Supabase client
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('❌ Session error - redirecting to login')
          setTimeout(() => router.push('/'), 1000)
          return
        }

        if (!session) {
          console.log('No session found')
          setStatus('🔐 No session found - redirecting to login')
          setTimeout(() => router.push('/'), 1000)
          return
        }

        setStatus('👤 Loading user profile...')
        console.log('✅ Session found for user:', session.user.id)

        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          setStatus('❌ Profile error - redirecting to login')
          setTimeout(() => router.push('/'), 1000)
          return
        }

        if (!profile) {
          console.log('No profile found')
          setStatus('❌ No profile found - redirecting to login')
          setTimeout(() => router.push('/'), 1000)
          return
        }

        console.log('✅ Profile found:', profile.role, profile.full_name)
        setStatus(`🎯 Redirecting to ${profile.role} dashboard...`)

        // Small delay to show the status, then redirect
        setTimeout(() => {
          switch (profile.role) {
            case 'teacher':
              router.push('/dashboard/teacher')
              break
            case 'parent':
              router.push('/dashboard/parent')
              break
            case 'student':
              router.push('/dashboard/student')
              break
            default:
              console.error('Unknown role:', profile.role)
              setStatus('❌ Unknown role - redirecting to login')
              router.push('/')
          }
        }, 1000)

      } catch (err) {
        console.error('Unexpected error:', err)
        setStatus('💥 Unexpected error - redirecting to login')
        setTimeout(() => router.push('/'), 1000)
      }
    }

    redirectToRoleDashboard()
  }, [router])

  // Show loading state while redirecting
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
          <p className="text-gray-500">{status}</p>
          <div className="mt-2 text-xs text-gray-400">
            This may take a few seconds...
          </div>
        </div>
      </div>
    </div>
  )
}