#!/usr/bin/env node

// Test JWT creation API
async function testJWTCreation() {
  console.log('🧪 Testing JWT creation API...\n');
  
  const testData = {
    userId: 'test-user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'teacher'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/create-jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📋 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ JWT creation API is working!');
      
      // Check if cookies were set
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('🍪 Cookies set:', setCookieHeader);
      } else {
        console.log('⚠️  No cookies were set in response');
      }
    } else {
      console.log('❌ JWT creation failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch {
        console.log('Raw error:', responseText);
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your development server is running on http://localhost:3000');
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/debug/auth-status');
    console.log('✅ Development server is running');
    return true;
  } catch (error) {
    console.log('❌ Development server is not running or not accessible');
    console.log('💡 Please start your dev server with: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testJWTCreation();
  }
}

main().catch(console.error);