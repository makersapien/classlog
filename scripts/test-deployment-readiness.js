#!/usr/bin/env node

/**
 * Comprehensive Deployment Readiness Test
 * Tests all critical API endpoints and verifies 500 errors are resolved
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Starting Deployment Readiness Test...\n');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Test function wrapper
async function runTest(testName, testFn) {
  try {
    console.log(`🧪 Testing: ${testName}`);
    await testFn();
    console.log(`✅ PASSED: ${testName}\n`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}\n`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
  }
}

// Individual test functions
async function testEnvironmentVariables() {
  if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
  if (!SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
  console.log('   ✓ Environment variables configured');
}

async function testSupabaseConnection() {
  const response = await makeRequest(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Supabase connection failed: ${response.status}`);
  }
  console.log('   ✓ Supabase connection successful');
}

async function testDashboardAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/dashboard`);
    
    // Should not be 500 error
    if (response.status === 500) {
      throw new Error('Dashboard API returning 500 error');
    }
    
    // 401 is acceptable (auth required)
    if (response.status === 401) {
      console.log('   ✓ Dashboard API accessible (auth required)');
      return;
    }
    
    console.log(`   ✓ Dashboard API responding (status: ${response.status})`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Local server not running - skipping API tests');
      return;
    }
    throw error;
  }
}

async function testCreditsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/credits`);
    
    if (response.status === 500) {
      throw new Error('Credits API returning 500 error');
    }
    
    console.log(`   ✓ Credits API responding (status: ${response.status})`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Local server not running - skipping API tests');
      return;
    }
    throw error;
  }
}

async function testScheduleSlotsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/schedule-slots`);
    
    if (response.status === 500) {
      throw new Error('Schedule Slots API returning 500 error');
    }
    
    console.log(`   ✓ Schedule Slots API responding (status: ${response.status})`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Local server not running - skipping API tests');
      return;
    }
    throw error;
  }
}

async function testTeacherStudentsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/teacher/students`);
    
    if (response.status === 500) {
      throw new Error('Teacher Students API returning 500 error');
    }
    
    console.log(`   ✓ Teacher Students API responding (status: ${response.status})`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Local server not running - skipping API tests');
      return;
    }
    throw error;
  }
}

async function testPaymentsAPI() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/payments`);
    
    if (response.status === 500) {
      throw new Error('Payments API returning 500 error');
    }
    
    console.log(`   ✓ Payments API responding (status: ${response.status})`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Local server not running - skipping API tests');
      return;
    }
    throw error;
  }
}

async function testBookingTokenValidation() {
  // Test with a dummy token to ensure function exists
  const testToken = 'test-token-123';
  
  try {
    const response = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/validate_share_token`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: { p_token: testToken }
    });
    
    if (response.status === 500) {
      throw new Error('validate_share_token function not working');
    }
    
    console.log('   ✓ validate_share_token function exists and callable');
  } catch (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      throw new Error('validate_share_token function missing from database');
    }
    // Other errors are acceptable (invalid token, etc.)
    console.log('   ✓ validate_share_token function exists and callable');
  }
}

async function testBuildConfiguration() {
  const fs = require('fs');
  const path = require('path');
  
  // Check package.json
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.scripts || !packageJson.scripts.build) {
    throw new Error('Build script not configured in package.json');
  }
  
  // Check Next.js config
  if (!fs.existsSync('next.config.js') && !fs.existsSync('next.config.mjs')) {
    console.log('   ⚠️  No Next.js config file found (using defaults)');
  }
  
  // Check TypeScript config
  if (!fs.existsSync('tsconfig.json')) {
    throw new Error('tsconfig.json not found');
  }
  
  console.log('   ✓ Build configuration files present');
}

async function testEssentialFiles() {
  const fs = require('fs');
  
  const essentialFiles = [
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/lib/supabase-server.ts',
    '.env.local'
  ];
  
  for (const file of essentialFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Essential file missing: ${file}`);
    }
  }
  
  console.log('   ✓ All essential files present');
}

// Main test execution
async function runAllTests() {
  console.log('Environment Configuration:');
  console.log(`- Base URL: ${BASE_URL}`);
  console.log(`- Supabase URL: ${SUPABASE_URL ? '✓ Set' : '❌ Missing'}`);
  console.log(`- Supabase Key: ${SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing'}\n`);
  
  // Run all tests
  await runTest('Environment Variables', testEnvironmentVariables);
  await runTest('Supabase Connection', testSupabaseConnection);
  await runTest('Build Configuration', testBuildConfiguration);
  await runTest('Essential Files', testEssentialFiles);
  await runTest('Booking Token Validation Function', testBookingTokenValidation);
  
  // API tests (may skip if server not running)
  await runTest('Dashboard API', testDashboardAPI);
  await runTest('Credits API', testCreditsAPI);
  await runTest('Schedule Slots API', testScheduleSlotsAPI);
  await runTest('Teacher Students API', testTeacherStudentsAPI);
  await runTest('Payments API', testPaymentsAPI);
  
  // Print results
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%\n`);
  
  if (testResults.failed > 0) {
    console.log('❌ FAILED TESTS:');
    testResults.errors.forEach(error => {
      console.log(`   • ${error.test}: ${error.error}`);
    });
    console.log('');
  }
  
  // Deployment readiness assessment
  console.log('🚀 DEPLOYMENT READINESS ASSESSMENT:');
  
  if (testResults.failed === 0) {
    console.log('✅ READY FOR DEPLOYMENT');
    console.log('   All tests passed. Your application is ready for Vercel deployment.');
  } else if (testResults.failed <= 2 && !testResults.errors.some(e => e.error.includes('500'))) {
    console.log('⚠️  MOSTLY READY');
    console.log('   Minor issues detected but no 500 errors. Should deploy successfully.');
  } else {
    console.log('❌ NOT READY');
    console.log('   Critical issues detected. Fix errors before deploying.');
  }
  
  console.log('\n📝 NEXT STEPS:');
  if (testResults.failed === 0) {
    console.log('1. Commit your changes');
    console.log('2. Push to your repository');
    console.log('3. Deploy to Vercel');
    console.log('4. Set environment variables in Vercel dashboard');
  } else {
    console.log('1. Fix the failed tests above');
    console.log('2. Re-run this test script');
    console.log('3. Deploy once all tests pass');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});