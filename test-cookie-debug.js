// Cookie Debug Test - Run this in browser console after login
async function debugCookieIssue() {
  console.log('🔍 Debugging Cookie Issue...')
  
  // 1. Check what cookies exist in the browser
  console.log('\n1️⃣ Browser Cookies:')
  const browserCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c)
  console.log('Total browser cookies:', browserCookies.length)
  browserCookies.forEach(cookie => {
    const [name, value] = cookie.split('=')
    console.log(`  ${name}: ${value ? value.substring(0, 20) + '...' : 'empty'}`)
  })
  
  // 2. Check specific ClassLogger cookies
  console.log('\n2️⃣ ClassLogger Cookies:')
  const authCookie = browserCookies.find(c => c.startsWith('classlogger_auth='))
  const extensionCookie = browserCookies.find(c => c.startsWith('classlogger_extension='))
  const teacherIdCookie = browserCookies.find(c => c.startsWith('classlogger_teacher_id='))
  
  console.log('Auth cookie:', authCookie ? '✅ Found' : '❌ Missing')
  console.log('Extension cookie:', extensionCookie ? '✅ Found' : '❌ Missing')
  console.log('Teacher ID cookie:', teacherIdCookie ? '✅ Found' : '❌ Missing')
  
  // 3. Test the debug endpoint
  console.log('\n3️⃣ Server-side Cookie Check:')
  try {
    const debugResponse = await fetch('/api/debug/auth-status', {
      credentials: 'include'
    })
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('Server sees cookies:', debugData.totalCookies)
      console.log('Auth cookies on server:', debugData.authCookies)
      console.log('JWT verification:', debugData.jwtVerification)
    } else {
      console.error('Debug endpoint failed:', debugResponse.status)
    }
  } catch (error) {
    console.error('Debug endpoint error:', error)
  }
  
  // 4. Test manual cookie creation
  console.log('\n4️⃣ Testing Manual Cookie Creation:')
  try {
    const createResponse = await fetch('/api/auth/create-jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'teacher'
      })
    })
    
    if (createResponse.ok) {
      console.log('✅ JWT creation successful')
      
      // Check cookies again after creation
      setTimeout(() => {
        const newCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c)
        console.log('Cookies after creation:', newCookies.length)
        const newAuthCookie = newCookies.find(c => c.startsWith('classlogger_auth='))
        console.log('New auth cookie:', newAuthCookie ? '✅ Found' : '❌ Still missing')
      }, 1000)
      
    } else {
      console.error('JWT creation failed:', createResponse.status)
      const errorData = await createResponse.json()
      console.error('Error:', errorData)
    }
  } catch (error) {
    console.error('JWT creation error:', error)
  }
  
  // 5. Test dashboard API
  console.log('\n5️⃣ Testing Dashboard API:')
  try {
    const dashboardResponse = await fetch('/api/dashboard?role=teacher', {
      credentials: 'include'
    })
    
    if (dashboardResponse.ok) {
      console.log('✅ Dashboard API working')
    } else {
      console.error('❌ Dashboard API failed:', dashboardResponse.status)
      const errorData = await dashboardResponse.json()
      console.error('Dashboard error:', errorData)
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
  }
  
  console.log('\n🏁 Cookie debug complete!')
}

// Run the debug
debugCookieIssue();