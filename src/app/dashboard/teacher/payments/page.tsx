// src/app/dashboard/teacher/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import PaymentCreditsPage from './PaymentCreditsPage'
import DashboardLayout from '../../DashboardLayout'
import { Loader2 } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'teacher' | 'parent' | 'student'
  avatar_url?: string
}

export default function TeacherPaymentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/auth/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, avatar_url')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile) {
          router.push('/auth/login')
          return
        }

        // Ensure only teachers can access this page
        if (profile.role !== 'teacher') {
          router.push(`/dashboard/${profile.role}`)
          return
        }

        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          avatar_url: profile.avatar_url,
          name: profile.full_name || profile.email
        } as User & { name: string })
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout user={user as User & { name: string }}>
      <PaymentCreditsPage />
    </DashboardLayout>
  )
}