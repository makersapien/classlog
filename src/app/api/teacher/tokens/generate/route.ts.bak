// File: src/app/api/teacher/tokens/generate/route.ts
// Generate weekly extension token for teacher

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { teacherId } = await request.json()

    if (!teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher ID is required' 
      }, { status: 400 })
    }

    console.log('🔐 Generating extension token for teacher:', teacherId)

    // Verify teacher exists and is active
    const { data: teacher, error: teacherError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single()

    if (teacherError || !teacher) {
      console.log('❌ Teacher verification failed:', teacherError)
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid teacher ID' 
      }, { status: 401 })
    }

    // Deactivate any existing active tokens for this teacher
    await supabase
      .from('extension_tokens')
      .update({ is_active: false })
      .eq('teacher_id', teacherId)
      .eq('is_active', true)

    // Generate new token
    const currentWeek = getWeekNumber(new Date())
    const currentYear = new Date().getFullYear()
    const randomPart = randomBytes(16).toString('hex')
    
    // Create readable token: CL_[short_teacher_id]_[year][week]_[random]
    const shortTeacherId = teacherId.split('-')[0] // First part of UUID
    const weekIdentifier = `${currentYear}${currentWeek.toString().padStart(2, '0')}`
    const readableToken = `CL_${shortTeacherId}_${weekIdentifier}_${randomPart.substring(0, 8)}`
    
    // Hash the token for storage (never store plain text)
    const tokenHash = createHash('sha256').update(readableToken).digest('hex')
    
    // Calculate expiry (next Monday at midnight)
    const expiryDate = getNextMondayMidnight()

    // Insert new token
    const { data: newToken, error: insertError } = await supabase
      .from('extension_tokens')
      .insert({
        teacher_id: teacherId,
        token_hash: tokenHash,
        expires_at: expiryDate.toISOString(),
        is_active: true,
        usage_count: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create token:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate token' 
      }, { status: 500 })
    }

    console.log('✅ Extension token generated successfully')

    return NextResponse.json({
      success: true,
      token: readableToken, // Only return plain token in response
      expiresAt: expiryDate.toISOString(),
      teacher: {
        name: teacher.full_name,
        email: teacher.email
      }
    })

  } catch (error) {
    console.error('❌ Generate token API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to get current week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Helper function to get next Monday at midnight
function getNextMondayMidnight(): Date {
  const now = new Date()
  const nextMonday = new Date(now)
  
  // Get days until next Monday (1 = Monday, 0 = Sunday)
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0) // Midnight
  
  return nextMonday
}