#!/usr/bin/env node

/**
 * Test specific API endpoints for 500 errors
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing: ${description}`);
    console.log(`   URL: ${BASE_URL}${path}`);
    
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 500) {
          console.log(`   ❌ 500 ERROR DETECTED`);
          try {
            const errorData = JSON.parse(data);
            console.log(`   Error: ${errorData.error || 'Unknown error'}`);
          } catch (e) {
            console.log(`   Raw error: ${data.substring(0, 200)}...`);
          }
        } else if (res.statusCode === 401) {
          console.log(`   ✅ OK (Auth required)`);
        } else if (res.statusCode === 200) {
          console.log(`   ✅ OK (Success)`);
        } else {
          console.log(`   ⚠️  Status ${res.statusCode} (May be OK)`);
        }
        
        console.log('');
        resolve({
          status: res.statusCode,
          data: data,
          path: path
        });
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Connection Error: ${error.message}\n`);
      resolve({
        status: 'ERROR',
        error: error.message,
        path: path
      });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing API Endpoints for 500 Errors\n');
  
  const endpoints = [
    { path: '/api/dashboard', desc: 'Dashboard API' },
    { path: '/api/credits', desc: 'Credits API' },
    { path: '/api/schedule-slots', desc: 'Schedule Slots API' },
    { path: '/api/teacher/students', desc: 'Teacher Students API' },
    { path: '/api/payments', desc: 'Payments API' },
    { path: '/api/auth/me', desc: 'Auth Me API' },
    { path: '/api/extension/auth-status', desc: 'Extension Auth Status' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.desc);
    results.push(result);
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const errors500 = results.filter(r => r.status === 500);
  const authRequired = results.filter(r => r.status === 401);
  const success = results.filter(r => r.status === 200);
  const other = results.filter(r => r.status !== 500 && r.status !== 401 && r.status !== 200 && r.status !== 'ERROR');
  
  console.log(`✅ Success (200): ${success.length}`);
  console.log(`🔐 Auth Required (401): ${authRequired.length}`);
  console.log(`⚠️  Other Status: ${other.length}`);
  console.log(`❌ 500 Errors: ${errors500.length}`);
  
  if (errors500.length > 0) {
    console.log('\n❌ ENDPOINTS WITH 500 ERRORS:');
    errors500.forEach(result => {
      console.log(`   • ${result.path}`);
    });
    console.log('\n🔧 ACTION REQUIRED: Fix these 500 errors before deployment');
  } else {
    console.log('\n✅ NO 500 ERRORS DETECTED!');
    console.log('🚀 APIs are ready for deployment');
  }
}

runTests().catch(console.error);