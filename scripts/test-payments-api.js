// Test script for payments API
const fetch = require('node-fetch');

async function testPaymentsApi() {
  console.log('Testing payments API...');
  
  try {
    // You'll need to get a valid auth token for this test
    // This is just a placeholder - you'll need to replace it with a real token
    const authToken = 'YOUR_AUTH_TOKEN';
    
    // Test awarding credits to a student
    const response = await fetch('http://localhost:3000/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=${authToken}`
      },
      body: JSON.stringify({
        action: 'award_credits',
        parent_email: 'test.student@student.local',
        credit_hours: 4,
        payment_amount: 2000,
        payment_note: 'Test payment from API test script',
        student_id: 'bc0a9110-3c86-45ca-bd86-cf9155d61516' // Replace with a valid student ID
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Test passed: Payment API returned success response');
    } else {
      console.log('❌ Test failed: Payment API returned error response');
      console.log('Error details:', data.error, data.details);
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
}

// Note: This script is for manual testing only
// You'll need to run it with a valid auth token and student ID
console.log('This script requires manual configuration before running.');
console.log('Please update the authToken and student_id values in the script.');
console.log('Then run: node scripts/test-payments-api.js');

// Uncomment to run the test
// testPaymentsApi();