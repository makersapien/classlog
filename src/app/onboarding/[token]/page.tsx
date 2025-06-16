// src/app/onboarding/[token]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface InvitationData {
  id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  whatsapp_group_url: string | null
  google_meet_url: string | null
  status: string
  expires_at: string
}

interface OnboardingPageProps {
  params: {
    token: string
  }
}

export default function OnboardingPage({ params }: OnboardingPageProps) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    loadInvitation()
  }, [params.token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('invitation_token', params.token)
        .eq('status', 'pending')
        .single()

      if (invitationError) {
        console.error('Invitation error:', invitationError)
        setError('Invalid or expired invitation link')
        return
      }

      if (!invitationData) {
        setError('Invitation not found')
        return
      }

      // Check if invitation is expired
      const expiresAt = new Date(invitationData.expires_at || '')
      if (expiresAt < new Date()) {
        setError('This invitation has expired')
        return
      }

      setInvitation(invitationData)
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = async () => {
    if (!invitation) return

    try {
      setIsCompleting(true)
      
      // Here you would typically:
      // 1. Create user accounts for parent and student
      // 2. Create enrollment records
      // 3. Mark invitation as completed
      // 4. Send confirmation emails

      // For now, just mark the invitation as completed
      const { error: updateError } = await supabase
        .from('student_invitations')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) {
        throw updateError
      }

      // Redirect to success page or login
      router.push('/onboarding/success')

    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('Failed to complete onboarding. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Student Enrollment Invitation</h1>
            <p className="text-blue-100 mt-2">Complete your enrollment process</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Student Name</label>
                    <p className="text-gray-900">{invitation.student_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Parent Name</label>
                    <p className="text-gray-900">{invitation.parent_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Parent Email</label>
                    <p className="text-gray-900">{invitation.parent_email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subject</label>
                    <p className="text-gray-900">{invitation.subject}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Year Group</label>
                    <p className="text-gray-900">{invitation.year_group}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Classes per Week</label>
                    <p className="text-gray-900">{invitation.classes_per_week}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Classes per Recharge</label>
                    <p className="text-gray-900">{invitation.classes_per_recharge}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Links */}
            {(invitation.whatsapp_group_url || invitation.google_meet_url) && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Class Links</h4>
                <div className="space-y-2">
                  {invitation.whatsapp_group_url && (
                    <a
                      href={invitation.whatsapp_group_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-green-600 hover:text-green-700"
                    >
                      📱 Join WhatsApp Group
                    </a>
                  )}
                  {invitation.google_meet_url && (
                    <a
                      href={invitation.google_meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      🎥 Join Google Meet
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Expiration Notice */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⏰ This invitation expires on{' '}
                <strong>
                  {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={completeOnboarding}
                disabled={isCompleting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCompleting ? 'Processing...' : 'Accept Invitation & Enroll'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}