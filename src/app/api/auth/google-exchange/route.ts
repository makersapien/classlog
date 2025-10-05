import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authorization code required' 
      }, { status: 400 })
    }

    console.log('🔄 Exchanging OAuth code for tokens...')

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/extension-callback`
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to exchange authorization code' 
      }, { status: 400 })
    }

    // Get user info from Google
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`)
    const userData = await userResponse.json()

    if (!userResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get user information' 
      }, { status: 400 })
    }

    console.log('👤 User authenticated:', userData.email)

    // Check if user exists in our database and is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', userData.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher account not found. Please make sure you have a ClassLogger account.' 
      }, { status: 404 })
    }

    if (profile.role !== 'teacher') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only teachers can use ClassLogger extension' 
      }, { status: 403 })
    }

    console.log('✅ Teacher verified:', profile.full_name)

    // Return success with teacher info and tokens
    return NextResponse.json({
      success: true,
      teacher: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email
      },
      session: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: profile.id
      }
    })

  } catch (error) {
    console.error('❌ OAuth exchange error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}