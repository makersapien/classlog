// src/app/api/teacher/analytics/token-usage/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET endpoint to fetch token usage analytics for teacher
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Token Usage Analytics API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can access token analytics
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access token analytics' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const days = parseInt(searchParams.get('days') || '30')
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json({ 
        error: 'Days parameter must be between 1 and 365' 
      }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build base query
    let query = supabase
      .from('share_tokens')
      .select(`
        id,
        token,
        access_count,
        last_accessed,
        created_at,
        expires_at,
        is_active,
        profiles!share_tokens_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('teacher_id', user.id)

    // Filter by student if specified
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: tokens, error: tokensError } = await query.order('created_at', { ascending: false })

    if (tokensError) {
      console.error('❌ Tokens fetch error:', tokensError)
      return NextResponse.json({ 
        error: 'Failed to fetch token data',
        details: tokensError.message
      }, { status: 500 })
    }

    // Get booking statistics for tokens
    const { data: bookingStats, error: bookingError } = await supabase
      .from('bookings')
      .select('student_id, status, booked_at')
      .eq('teacher_id', user.id)
      .gte('booked_at', startDate.toISOString())

    if (bookingError) {
      console.error('❌ Booking stats error:', bookingError)
      return NextResponse.json({ 
        error: 'Failed to fetch booking statistics',
        details: bookingError.message
      }, { status: 500 })
    }

    // Process analytics data
    const analytics = {
      summary: {
        total_tokens: tokens?.length || 0,
        active_tokens: tokens?.filter(t => t.is_active).length || 0,
        expired_tokens: tokens?.filter(t => new Date(t.expires_at) <= new Date()).length || 0,
        total_access_count: tokens?.reduce((sum, t) => sum + (t.access_count || 0), 0) || 0,
        tokens_with_recent_access: tokens?.filter(t => 
          t.last_accessed && new Date(t.last_accessed) >= startDate
        ).length || 0
      },
      tokens: tokens?.map(token => {
        const studentBookings = bookingStats?.filter(b => b.student_id === token.profiles?.id) || []
        const isExpired = new Date(token.expires_at) <= new Date()
        const hasRecentAccess = token.last_accessed && new Date(token.last_accessed) >= startDate
        
        return {
          id: token.id,
          token: token.token.substring(0, 8) + '...', // Partial token for security
          student: {
            id: token.profiles?.id,
            name: token.profiles?.full_name,
            email: token.profiles?.email
          },
          access_count: token.access_count,
          last_accessed: token.last_accessed,
          created_at: token.created_at,
          expires_at: token.expires_at,
          is_active: token.is_active,
          is_expired: isExpired,
          has_recent_access: hasRecentAccess,
          booking_stats: {
            total_bookings: studentBookings.length,
            confirmed_bookings: studentBookings.filter(b => b.status === 'confirmed').length,
            completed_bookings: studentBookings.filter(b => b.status === 'completed').length,
            cancelled_bookings: studentBookings.filter(b => b.status === 'cancelled').length
          }
        }
      }) || [],
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        days: days
      }
    }

    // Calculate usage trends (group by day)
    const usageTrends = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayBookings = bookingStats?.filter(b => 
        b.booked_at.split('T')[0] === dateStr
      ).length || 0
      
      usageTrends.push({
        date: dateStr,
        bookings: dayBookings
      })
    }

    analytics.usage_trends = usageTrends

    console.log('✅ Token analytics loaded')

    return NextResponse.json({
      success: true,
      analytics
    })
  } catch (error) {
    console.error('❌ Token usage analytics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}