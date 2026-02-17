#!/usr/bin/env node

/**
 * Test React components for common issues
 */

const http = require('http');

async function testHomePage() {
  return new Promise((resolve) => {
    console.log('🧪 Testing: Home page for React errors');
    
    const req = http.request('http://localhost:3000/', {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 500) {
          console.log(`   ❌ 500 ERROR - React component issue`);
          if (data.includes('useState is not defined')) {
            console.log(`   🔍 Found useState error in response`);
          }
          if (data.includes('DevBanner')) {
            console.log(`   🔍 DevBanner component error detected`);
          }
        } else if (res.statusCode === 200) {
          console.log(`   ✅ Page loads successfully`);
          if (data.includes('🧪 JWT Test Mode')) {
            console.log(`   ✅ DevBanner component rendered correctly`);
          }
        }
        
        resolve({
          status: res.statusCode,
          hasReactError: data.includes('useState is not defined'),
          hasDevBanner: data.includes('🧪 JWT Test Mode')
        });
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Connection Error: ${error.message}`);
      resolve({
        status: 'ERROR',
        error: error.message
      });
    });
    
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Testing React Components\n');
  
  const result = await testHomePage();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 REACT COMPONENT TEST RESULTS');
  console.log('='.repeat(50));
  
  if (result.status === 200) {
    console.log('✅ React components are working correctly');
    if (result.hasDevBanner) {
      console.log('✅ DevBanner component renders without errors');
    }
    console.log('🚀 Ready for deployment!');
  } else if (result.status === 500 && result.hasReactError) {
    console.log('❌ React component errors detected');
    console.log('🔧 Fix React hook imports before deployment');
  } else {
    console.log(`⚠️  Unexpected status: ${result.status}`);
  }
}

runTest().catch(console.error);