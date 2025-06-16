'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams?.get('role') || 'student'

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Auth callback started with role:', role)
        
        // Handle the auth callback - Supabase automatically processes the URL fragments
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Auth error:', error)
          router.push('/?error=auth_failed')
          return
        }

        if (data.session) {
          const user = data.session.user
          console.log('✅ User authenticated:', user.id, user.email)
          
          // Create or update user profile with role
          const profileData = {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
            role: role as 'teacher' | 'parent' | 'student',
            status: 'active'
          }

          console.log('📝 Creating/updating profile:', profileData)

          // Use the same supabase client as dashboard
          const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'id'
            })
            .select()
            .single()

          if (profileError) {
            console.error('❌ Profile creation error:', profileError)
            // Don't stop here - user is still authenticated
            console.log('⚠️ Continuing despite profile error...')
          } else {
            console.log('✅ Profile created/updated successfully:', profileResult)
          }

          // Wait a moment for everything to settle
          console.log('⏳ Waiting for session to stabilize...')
          await new Promise(resolve => setTimeout(resolve, 1500))

          // Redirect to appropriate dashboard based on role
          const dashboardRoute = `/dashboard/${role}`
          console.log('🔄 Redirecting to:', dashboardRoute)
          
          // Force redirect with window.location for reliability
          window.location.href = dashboardRoute
          
        } else {
          console.error('❌ No session found after auth')
          router.push('/?error=no_session')
        }
      } catch (error) {
        console.error('💥 Callback handling error:', error)
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
        
        <div className="text-sm text-emerald-600 font-semibold mb-4">
          Signing in as: {role.charAt(0).toUpperCase() + role.slice(1)} ✨
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div>🔄 Processing authentication...</div>
          <div>📝 Creating your profile...</div>
          <div>🎯 Redirecting to dashboard...</div>
        </div>
      </div>
    </div>
  )
}