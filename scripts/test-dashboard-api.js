// Test script for dashboard API
const fetch = require('node-fetch');

async function testDashboardApi() {
  console.log('Testing dashboard API...');
  
  try {
    // You'll need to get a valid auth token for this test
    // This is just a placeholder - you'll need to replace it with a real token
    const authToken = 'YOUR_AUTH_TOKEN';
    
    // Test the dashboard API with different roles
    const roles = ['teacher', 'student', 'parent'];
    
    for (const role of roles) {
      console.log(`Testing dashboard API with role: ${role}`);
      
      const response = await fetch(`http://localhost:3000/api/dashboard?role=${role}`, {
        method: 'GET',
        headers: {
          'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=${authToken}`
        }
      });
      
      const data = await response.json();
      
      console.log(`Response status for ${role}:`, response.status);
      console.log(`Response data for ${role}:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      
      if (response.ok) {
        console.log(`✅ Test passed for ${role}: Dashboard API returned success response`);
      } else {
        console.log(`❌ Test failed for ${role}: Dashboard API returned error response`);
        console.log('Error details:', data.error, data.details);
      }
      
      console.log('-----------------------------------');
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
}

// Note: This script is for manual testing only
// You'll need to run it with a valid auth token
console.log('This script requires manual configuration before running.');
console.log('Please update the authToken value in the script.');
console.log('Then run: node scripts/test-dashboard-api.js');

// Uncomment to run the test
// testDashboardApi();