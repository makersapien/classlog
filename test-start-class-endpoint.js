// Test script for the fixed start-class endpoint
// Run this in browser console after logging in

async function testStartClassEndpoint() {
  console.log('🧪 Testing Start Class Endpoint...')
  
  // 1. Get authentication token first
  console.log('\n1️⃣ Getting authentication token...')
  try {
    const tokenResponse = await fetch('/api/extension/issue-temp-token', {
      method: 'POST',
      credentials: 'include'
    })
    
    if (!tokenResponse.ok) {
      console.error('❌ Failed to get token:', tokenResponse.status)
      return
    }
    
    const tokenData = await tokenResponse.json()
    console.log('✅ Got token for:', tokenData.user.email)
    
    // 2. Test the start-class endpoint with extension format
    console.log('\n2️⃣ Testing start-class endpoint...')
    
    const startClassResponse = await fetch('/api/extension/start-class', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
      },
      body: JSON.stringify({
        "meetUrl": "https://meet.google.com/test-meeting-id",
        "platform": "Google Meet", 
        "title": "Test Google Meet Class - " + new Date().toLocaleTimeString()
      })
    })
    
    const startClassData = await startClassResponse.json()
    
    console.log('📊 Start Class Response:')
    console.log('Status:', startClassResponse.status)
    console.log('Success:', startClassData.success)
    console.log('Data:', startClassData)
    
    if (startClassResponse.ok && startClassData.success) {
      console.log('✅ Start class endpoint working!')
      console.log('Class ID:', startClassData.class_log_id)
      console.log('Student:', startClassData.student_name)
      console.log('Subject:', startClassData.subject)
    } else {
      console.error('❌ Start class failed:', startClassData.error)
      
      if (startClassResponse.status === 404) {
        console.log('💡 This is expected if you don\'t have an enrollment with this test Meet URL')
        console.log('💡 To fix: Create a student enrollment in your dashboard with Meet URL: https://meet.google.com/test-meeting-id')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('\n🏁 Test complete!')
}

// Run the test
testStartClassEndpoint();