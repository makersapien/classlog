// Test script for credits API
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api/credits';
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE'; // Replace with a valid auth cookie

// Test cases
const testCases = [
  {
    name: 'Verify function exists',
    method: 'GET',
    url: `${API_URL}?verify_function=true`,
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.functionVerification && res.functionVerification.function_exists
  },
  {
    name: 'Purchase credits',
    method: 'POST',
    body: {
      action: 'purchase',
      studentId: 'STUDENT_ID', // Replace with a valid student ID
      hours: 5,
      description: 'Test credit purchase'
    },
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.transaction && res.newBalance > 0
  },
  {
    name: 'Get credits for student',
    method: 'GET',
    url: `${API_URL}?student_id=STUDENT_ID`, // Replace with a valid student ID
    expectedStatus: 200,
    expectedResponse: (res) => res.success && Array.isArray(res.creditAccounts) && Array.isArray(res.transactions)
  },
  {
    name: 'Deduct credits',
    method: 'POST',
    body: {
      action: 'deduction',
      studentId: 'STUDENT_ID', // Replace with a valid student ID
      hours: 1,
      description: 'Test credit deduction'
    },
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.transaction && res.transaction.transaction_type === 'deduction'
  },
  {
    name: 'Verify function with POST',
    method: 'POST',
    body: {
      action: 'verify_function'
    },
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.functionVerification && res.functionVerification.function_exists
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Starting credits API tests...');
  
  for (const test of testCases) {
    try {
      console.log(`\n🔍 Running test: ${test.name}`);
      
      const url = test.url || API_URL;
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sb-auth-token=${AUTH_COOKIE}`
        }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // Check status
      if (response.status !== test.expectedStatus) {
        console.log(`❌ Test failed: Expected status ${test.expectedStatus}, got ${response.status}`);
        continue;
      }
      
      // Check response
      if (test.expectedResponse && !test.expectedResponse(data)) {
        console.log('❌ Test failed: Response did not match expected criteria');
        continue;
      }
      
      console.log('✅ Test passed!');
    } catch (error) {
      console.error(`❌ Test error: ${error.message}`);
    }
  }
  
  console.log('\n🏁 All tests completed');
}

// Run the tests
runTests();