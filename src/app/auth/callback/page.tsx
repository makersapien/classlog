'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)

  // Rest of the component logic stays the same...

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Processing OAuth callback...')
        
        // Get role from URL params for redirect
        const role = searchParams.get('role')
        
        // The auth helpers automatically handle the code exchange
        // We just need to wait for the session to be established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          // If no session yet, listen for auth state change
          setStatus('Waiting for authentication to complete...')
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe()
              await processAuthenticatedUser(session, role)
            }
          })
          
          return
        }

        // If we already have a session, process it
        await processAuthenticatedUser(session, role)

      } catch (error) {
        console.error('Auth callback error:', error)
        setError(error instanceof Error ? error.message : 'Authentication failed')
        setStatus('Authentication failed')
      }
    }

    const processAuthenticatedUser = async (session: { user: { id: string; email?: string | null } }, role: string | null) => {
      try {
        setStatus('Getting user profile...')
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile) {
          throw new Error('Profile not found')
        }

        setStatus('Creating authentication cookies...')
        
        // Validate required user data
        if (!session.user?.id || !session.user?.email) {
          throw new Error('Invalid user session data')
        }

        // Create JWT cookies by calling the API
        const response = await fetch('/api/auth/create-jwt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            name: profile.full_name,
            role: profile.role
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to create cookies: ${errorText}`)
        }

        setStatus('Authentication successful! Redirecting...')
        
        // Redirect based on role
        const redirectPath = role === 'teacher' ? '/dashboard' : '/student-dashboard'
        
        setTimeout(() => {
          router.push(redirectPath)
        }, 1000)

      } catch (error) {
        console.error('Auth processing error:', error)
        setError(error instanceof Error ? error.message : 'Authentication processing failed')
        setStatus('Authentication failed')
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Authentication Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/auth/signin')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Authenticating</h3>
          <p className="mt-1 text-sm text-gray-500">{status}</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}