#!/usr/bin/env node

// Debug the auth flow step by step
async function debugAuthFlow() {
  console.log('🔍 Debugging auth flow...\n');
  
  // Test 1: Check if we can connect to Supabase
  console.log('1️⃣ Testing Supabase connection...');
  try {
    const response = await fetch('http://localhost:3000/api/debug/auth-status');
    if (response.ok) {
      console.log('✅ Can connect to local server');
    } else {
      console.log('❌ Cannot connect to local server');
      return;
    }
  } catch (error) {
    console.log('❌ Server not running:', error.message);
    return;
  }
  
  // Test 2: Test JWT creation with a mock user
  console.log('\n2️⃣ Testing JWT creation API...');
  const mockUser = {
    userId: 'mock-user-123',
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
      body: JSON.stringify(mockUser)
    });
    
    const responseText = await response.text();
    console.log('📋 JWT API Response status:', response.status);
    console.log('📋 JWT API Response:', responseText);
    
    if (response.ok) {
      console.log('✅ JWT creation API is working (even without user in DB)');
    } else {
      console.log('❌ JWT creation API failed');
    }
  } catch (error) {
    console.log('❌ JWT API error:', error.message);
  }
  
  // Test 3: Check if we can query Supabase profiles table
  console.log('\n3️⃣ Testing Supabase profiles table access...');
  try {
    // This would require a test endpoint, but let's skip for now
    console.log('ℹ️ Skipping direct Supabase test (would need test endpoint)');
  } catch (error) {
    console.log('❌ Supabase test error:', error.message);
  }
  
  console.log('\n🎯 Debug Summary:');
  console.log('- If JWT API works with mock data, the issue is likely in profile creation timing');
  console.log('- The auth callback should create the profile BEFORE calling JWT API');
  console.log('- Check browser console for detailed auth callback logs');
}

debugAuthFlow().catch(console.error);