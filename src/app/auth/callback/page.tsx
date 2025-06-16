////   src/auth/callback/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, createOrUpdateProfile } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams?.get('role') || 'student'

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback - Supabase automatically processes the URL fragments
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error)
          router.push('/?error=auth_failed')
          return
        }

        if (data.session) {
          const user = data.session.user
          console.log('User authenticated:', user)
          
          // Create or update user profile with role
          const profileData = {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata.full_name || user.user_metadata.name || user.email || '',
            avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || '',
            role: role as 'teacher' | 'parent' | 'student',
            updated_at: new Date().toISOString()
          }

          console.log('Creating profile with data:', profileData)

          const { data: profileResult, error: profileError } = await createOrUpdateProfile(profileData)

          if (profileError) {
            console.error('Profile creation error:', profileError)
            // Continue anyway - user is authenticated
          } else {
            console.log('Profile created/updated:', profileResult)
          }

          // Small delay to ensure everything is processed
          setTimeout(() => {
            // Redirect to appropriate dashboard based on role
            switch (role) {
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
                router.push('/dashboard/student')
            }
          }, 1000)
        } else {
          console.error('No session found')
          router.push('/?error=no_session')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.push('/?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [router, role])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
              </svg>
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              ClassLogger
            </span>
          </div>
        </div>
        
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-6"></div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Setting up your account...</h2>
        <p className="text-gray-600 mb-4">Please wait while we complete your sign-in process.</p>
        
        <div className="text-sm text-emerald-600 font-semibold">
          Signing in as: {role.charAt(0).toUpperCase() + role.slice(1)} ✨
        </div>
      </div>
    </div>
  )
}