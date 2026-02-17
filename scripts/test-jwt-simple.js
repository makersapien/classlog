#!/usr/bin/env node

// Simple test of JWT functions
require('dotenv').config({ path: '.env.local' });

async function testJWTFunctions() {
  console.log('🧪 Testing JWT functions...\n');
  
  try {
    // Import the JWT functions
    const { signJWT, verifyJWT } = require('../src/lib/jwt.ts');
    
    const testPayload = {
      userId: 'test-123',
      email: 'test@example.com',
      role: 'teacher',
      name: 'Test User'
    };
    
    console.log('📝 Creating JWT with payload:', testPayload);
    
    // Test signing
    const token = signJWT(testPayload);
    console.log('✅ JWT created successfully');
    console.log('🔑 Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test verification
    const decoded = verifyJWT(token);
    console.log('✅ JWT verified successfully');
    console.log('📋 Decoded payload:', decoded);
    
    if (decoded && decoded.userId === testPayload.userId) {
      console.log('\n✅ JWT functions are working correctly!');
    } else {
      console.log('\n❌ JWT verification failed - payload mismatch');
    }
    
  } catch (error) {
    console.log('❌ JWT test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testJWTFunctions();