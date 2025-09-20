// Test script for extension token handshake system
// Run this in browser console after login to test the new authentication flow

async function testExtensionTokenHandshake() {
  console.log('🧪 Testing Extension Token Handshake System...')
  
  // 1. Test temp token endpoint
  console.log('\n1️⃣ Testing /api/extension/issue-temp-token:')
  try {
    const tokenResponse = await fetch('/api/extension/issue-temp-token', {
      method: 'POST',
      credentials: 'include'
    })
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json()
      console.log('✅ Temp token endpoint working')
      console.log('Token issued:', !!tokenData.token)
      console.log('User data:', tokenData.user)
      
      // 2. Test Bearer token authentication
      console.log('\n2️⃣ Testing Bearer token authentication:')
      
      const authResponse = await fetch('/api/extension/auth-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.token}`
        }
      })
      
      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log('✅ Bearer token authentication working')
        console.log('Auth success:', authData.success)
        console.log('Auth method:', authData.authMethod)
        console.log('Teacher data:', authData.teacher)
      } else {
        console.error('❌ Bearer token auth failed:', authResponse.status)
        const errorData = await authResponse.json()
        console.error('Error:', errorData)
      }
      
      // 3. Test postMessage simulation
      console.log('\n3️⃣ Testing postMessage simulation:')
      
      // Listen for postMessage
      const messageListener = (event) => {
        if (event.data.source === 'classlogger-webapp' && event.data.type === 'EXTENSION_TEMP_TOKEN') {
          console.log('✅ PostMessage received!')
          console.log('Token:', !!event.data.token)
          console.log('User:', event.data.user)
          window.removeEventListener('message', messageListener)
        }
      }
      
      window.addEventListener('message', messageListener)
      
      // Simulate the dashboard postMessage
      window.postMessage({
        source: 'classlogger-webapp',
        type: 'EXTENSION_TEMP_TOKEN',
        token: tokenData.token,
        user: tokenData.user
      }, '*')
      
      // Clean up listener after 2 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageListener)
      }, 2000)
      
    } else {
      console.error('❌ Temp token endpoint failed:', tokenResponse.status)
      const errorData = await tokenResponse.json()
      console.error('Error:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  // 4. Test cookie fallback
  console.log('\n4️⃣ Testing cookie fallback (without Bearer token):')
  try {
    const cookieResponse = await fetch('/api/extension/auth-status', {
      method: 'GET',
      credentials: 'include'
    })
    
    if (cookieResponse.ok) {
      const cookieData = await cookieResponse.json()
      console.log('✅ Cookie fallback working')
      console.log('Auth success:', cookieData.success)
      console.log('Auth method:', cookieData.authMethod || 'cookie')
    } else {
      console.log('⚠️ Cookie fallback failed (expected if no cookies):', cookieResponse.status)
    }
  } catch (error) {
    console.error('❌ Cookie fallback test failed:', error)
  }
  
  console.log('\n🏁 Extension token handshake test complete!')
  console.log('\n📋 Summary:')
  console.log('- Temp token endpoint: Issue JWT tokens for extension')
  console.log('- Bearer auth: Extension uses Authorization header')
  console.log('- PostMessage: Dashboard sends tokens to extension')
  console.log('- Cookie fallback: Maintains backward compatibility')
}

// Run the test
testExtensionTokenHandshake();