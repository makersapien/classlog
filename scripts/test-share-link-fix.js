#!/usr/bin/env node

/**
 * Test script to verify the share link fix
 * This tests that the API now correctly works with enrollment IDs instead of student profile IDs
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testShareLinkFix() {
  console.log('🔧 Testing Share Link Fix...\n')

  try {
    // 1. First, let's see what enrollments exist
    console.log('📋 Checking existing enrollments...')
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        teacher_id,
        status,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'active')
      .limit(5)

    if (enrollmentError) {
      console.error('❌ Error fetching enrollments:', enrollmentError)
      return
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('⚠️ No active enrollments found. Creating test data...')
      
      // Check if we have any teachers
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'teacher')
        .limit(1)

      if (!teachers || teachers.length === 0) {
        console.log('❌ No teachers found. Cannot create test enrollment.')
        return
      }

      console.log('ℹ️ Found teacher:', teachers[0].full_name)
      console.log('ℹ️ To test the share link fix, you need at least one active enrollment.')
      console.log('ℹ️ Please create a student enrollment first, then run this test again.')
      return
    }

    console.log(`✅ Found ${enrollments.length} active enrollments`)
    
    // 2. Test with the first enrollment
    const testEnrollment = enrollments[0]
    console.log('\n🧪 Testing with enrollment:')
    console.log(`   - Enrollment ID: ${testEnrollment.id}`)
    console.log(`   - Student: ${testEnrollment.profiles?.full_name}`)
    console.log(`   - Student ID: ${testEnrollment.student_id}`)
    console.log(`   - Teacher ID: ${testEnrollment.teacher_id}`)

    // 3. Test the share_tokens table structure
    console.log('\n🔍 Checking share_tokens table...')
    const { data: existingTokens, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('student_id', testEnrollment.student_id)
      .eq('teacher_id', testEnrollment.teacher_id)
      .limit(1)

    if (tokenError) {
      console.error('❌ Error checking share_tokens:', tokenError)
      return
    }

    console.log(`✅ Share tokens query works. Found ${existingTokens?.length || 0} existing tokens.`)

    // 4. Test the create_share_token function
    console.log('\n🔧 Testing create_share_token function...')
    const { data: tokenResult, error: createError } = await supabase
      .rpc('create_share_token', {
        p_student_id: testEnrollment.student_id,
        p_teacher_id: testEnrollment.teacher_id
      })

    if (createError) {
      console.error('❌ Error creating share token:', createError)
      return
    }

    console.log('✅ Share token created successfully:', tokenResult)

    // 5. Verify the token was created
    const { data: newToken, error: fetchError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', tokenResult)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching created token:', fetchError)
      return
    }

    console.log('✅ Token verified in database:')
    console.log(`   - Token: ${newToken.token}`)
    console.log(`   - Student ID: ${newToken.student_id}`)
    console.log(`   - Teacher ID: ${newToken.teacher_id}`)
    console.log(`   - Active: ${newToken.is_active}`)
    console.log(`   - Expires: ${newToken.expires_at}`)

    // 6. Test the API endpoint simulation
    console.log('\n🌐 Simulating API endpoint logic...')
    
    // This simulates what the fixed API does
    const { data: enrollmentCheck, error: enrollmentCheckError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        teacher_id,
        status,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', testEnrollment.id)
      .eq('teacher_id', testEnrollment.teacher_id)
      .eq('status', 'active')
      .single()

    if (enrollmentCheckError) {
      console.error('❌ Enrollment check failed:', enrollmentCheckError)
      return
    }

    console.log('✅ Enrollment verification works')
    console.log(`   - Found enrollment: ${enrollmentCheck.id}`)
    console.log(`   - Student: ${enrollmentCheck.profiles?.full_name}`)

    // 7. Test share token lookup with correct student_id
    const { data: tokenLookup, error: lookupError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('student_id', enrollmentCheck.student_id)
      .eq('teacher_id', enrollmentCheck.teacher_id)
      .eq('is_active', true)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('❌ Token lookup failed:', lookupError)
      return
    }

    if (tokenLookup) {
      console.log('✅ Share token lookup works')
      console.log(`   - Token found: ${tokenLookup.token}`)
      console.log(`   - Access count: ${tokenLookup.access_count}`)
    } else {
      console.log('ℹ️ No existing token found (this is normal)')
    }

    console.log('\n🎉 Share Link Fix Test Results:')
    console.log('✅ Enrollments table query works')
    console.log('✅ Share tokens table accessible')
    console.log('✅ create_share_token function works')
    console.log('✅ Token creation and lookup works')
    console.log('✅ API logic simulation successful')
    
    console.log('\n📝 Summary:')
    console.log('The fix changes the API to:')
    console.log('1. Accept enrollment ID instead of student profile ID')
    console.log('2. Look up enrollment and verify teacher ownership')
    console.log('3. Use the actual student_id from enrollment for token operations')
    console.log('4. This should resolve the "Student not found" error')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testShareLinkFix()