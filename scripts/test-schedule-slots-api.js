// Test script for schedule slots API
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api/schedule-slots';
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE'; // Replace with a valid auth cookie

// Test cases
const testCases = [
  {
    name: 'Get all schedule slots',
    method: 'GET',
    url: API_URL,
    expectedStatus: 200,
    expectedResponse: (res) => res.success && Array.isArray(res.slots)
  },
  {
    name: 'Create a new schedule slot (teacher only)',
    method: 'POST',
    body: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      start_time: '10:00:00',
      end_time: '11:00:00',
      title: 'Test Slot',
      description: 'Test slot description',
      subject: 'Test Subject',
      duration_minutes: 60,
      max_students: 1
    },
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.slot && res.slot.id
  },
  {
    name: 'Get slots for a specific teacher',
    method: 'GET',
    url: `${API_URL}?teacher_id=TEACHER_ID`, // Replace with a valid teacher ID
    expectedStatus: 200,
    expectedResponse: (res) => res.success && Array.isArray(res.slots)
  },
  {
    name: 'Book a schedule slot',
    method: 'POST',
    url: `${API_URL}/SLOT_ID/book`, // Replace with a valid slot ID
    body: {
      student_id: 'STUDENT_ID' // Replace with a valid student ID
    },
    expectedStatus: 200,
    expectedResponse: (res) => res.success && res.transaction && res.transaction.slot_id
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Starting schedule slots API tests...');
  
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