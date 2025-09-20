// Simple test to verify the authentication flow is working
// Run this in browser console after login

async function testAuthFlow() {
  console.log('🧪 Testing authentication flow...')
  
  // 1. Check if cookies exist
  console.log('\n1️⃣ Checking cookies:')
  const cookies = document.cookie.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith('classlogger_auth='))
  const extensionCookie = cookies.find(c => c.startsWith('classlogger_extension='))
  const teacherIdCookie = cookies.find(c => c.startsWith('classlogger_teacher_id='))
  
  console.log('Auth cookie:', authCookie ? '✅ Found' : '❌ Missing')
  console.log('Extension cookie:', extensionCookie ? '✅ Found' : '❌ Missing')
  console.log('Teacher ID cookie:', teacherIdCookie ? '✅ Found' : '❌ Missing')
  
  // 2. Test debug endpoint
  console.log('\n2️⃣ Testing debug endpoint:')
  try {
    const debugResponse = await fetch('/api/debug/cookies', {
      credentials: 'include'
    })
    const debugData = await debugResponse.json()
    console.log('Debug endpoint:', debugResponse.ok ? '✅ Working' : '❌ Failed')
    console.log('Cookie count:', debugData.totalCookies)
    console.log('Auth cookies found:', debugData.authCookies)
  } catch (error) {
    console.error('Debug endpoint error:', error)
  }
  
  // 3. Test extension verify endpoint
  console.log('\n3️⃣ Testing extension verify:')
  try {
    const verifyResponse = await fetch('/api/extension/verify', {
      method: 'POST',
      credentials: 'include'
    })
    const verifyData = await verifyResponse.json()
    console.log('Verify endpoint:', verifyResponse.ok ? '✅ Working' : '❌ Failed')
    console.log('Login status:', verifyData.loggedIn ? '✅ Logged in' : '❌ Not logged in')
    if (verifyData.loggedIn) {
      console.log('Teacher ID:', verifyData.teacherId)
      console.log('Teacher name:', verifyData.teacherName)
    }
  } catch (error) {
    console.error('Verify endpoint error:', error)
  }
  
  // 4. Test extension auth-status endpoint
  console.log('\n4️⃣ Testing extension auth-status:')
  try {
    const authStatusResponse = await fetch('/api/extension/auth-status', {
      method: 'GET',
      credentials: 'include'
    })
    const authStatusData = await authStatusResponse.json()
    console.log('Auth-status endpoint:', authStatusResponse.ok ? '✅ Working' : '❌ Failed')
    console.log('Auth success:', authStatusData.success ? '✅ Success' : '❌ Failed')
    if (authStatusData.success) {
      console.log('Auth method:', authStatusData.authMethod)
      console.log('Teacher info:', authStatusData.teacher)
    }
  } catch (error) {
    console.error('Auth-status endpoint error:', error)
  }
  
  console.log('\n🏁 Test complete!')
}

// Run the test
testAuthFlow();