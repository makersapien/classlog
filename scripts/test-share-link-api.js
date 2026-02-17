#!/usr/bin/env node

/**
 * Test the actual share link API endpoint with the fix
 */

const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
let baseUrl = 'http://localhost:3000'
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_BASE_URL=')) {
      baseUrl = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.log('ℹ️ Using default base URL:', baseUrl)
}

async function testShareLinkAPI() {
  console.log('🌐 Testing Share Link API Endpoint...\n')

  try {
    // First, get the list of students to find an enrollment ID
    console.log('📋 Fetching students list...')
    const studentsResponse = await fetch(`${baseUrl}/api/teacher/students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })

    if (!studentsResponse.ok) {
      console.error('❌ Failed to fetch students:', studentsResponse.status, studentsResponse.statusText)
      const errorText = await studentsResponse.text()
      console.error('Error details:', errorText)
      return
    }

    const studentsData = await studentsResponse.json()
    console.log('✅ Students API response received')

    if (!studentsData.students || studentsData.students.length === 0) {
      console.log('⚠️ No students found. Cannot test share link API.')
      console.log('ℹ️ Please ensure you have at least one active enrollment.')
      return
    }

    const testStudent = studentsData.students[0]
    console.log(`🧪 Testing with student: ${testStudent.student_name}`)
    console.log(`   - Enrollment ID: ${testStudent.id}`)
    console.log(`   - Student ID: ${testStudent.student_id}`)

    // Test GET endpoint (fetch existing share link)
    console.log('\n🔍 Testing GET /api/teacher/students/[id]/share-link...')
    const getResponse = await fetch(`${baseUrl}/api/teacher/students/${testStudent.id}/share-link`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })

    console.log(`📡 GET Response Status: ${getResponse.status}`)

    if (getResponse.ok) {
      const getData = await getResponse.json()
      console.log('✅ GET request successful')
      console.log('📊 Response data:')
      console.log(`   - Has token: ${getData.has_token}`)
      if (getData.has_token) {
        console.log(`   - Token: ${getData.token?.substring(0, 20)}...`)
        console.log(`   - Share URL: ${getData.share_url}`)
        console.log(`   - Access count: ${getData.access_count}`)
      }
      console.log(`   - Student: ${getData.student?.name}`)
    } else {
      const errorData = await getResponse.json()
      console.error('❌ GET request failed:', errorData)
      return
    }

    // Test POST endpoint (create share link)
    console.log('\n🔧 Testing POST /api/teacher/students/[id]/share-link...')
    const postResponse = await fetch(`${baseUrl}/api/teacher/students/${testStudent.id}/share-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })

    console.log(`📡 POST Response Status: ${postResponse.status}`)

    if (postResponse.ok) {
      const postData = await postResponse.json()
      console.log('✅ POST request successful')
      console.log('📊 Response data:')
      console.log(`   - Success: ${postData.success}`)
      console.log(`   - Token: ${postData.token?.substring(0, 20)}...`)
      console.log(`   - Share URL: ${postData.share_url}`)
      console.log(`   - Student: ${postData.student?.name}`)
      console.log(`   - Expires: ${postData.expires_at}`)
    } else {
      const errorData = await postResponse.json()
      console.error('❌ POST request failed:', errorData)
      return
    }

    console.log('\n🎉 API Test Results:')
    console.log('✅ Students list API works')
    console.log('✅ GET share link API works')
    console.log('✅ POST share link API works')
    console.log('✅ No "Student not found" errors!')
    
    console.log('\n📝 Fix Summary:')
    console.log('The API now correctly:')
    console.log('1. Accepts enrollment IDs from the frontend')
    console.log('2. Looks up enrollments instead of student profiles directly')
    console.log('3. Verifies teacher ownership of the enrollment')
    console.log('4. Uses the correct student_id for token operations')

  } catch (error) {
    console.error('💥 API test failed:', error)
    console.log('\nℹ️ Make sure your development server is running on', baseUrl)
  }
}

// Run the test
testShareLinkAPI()