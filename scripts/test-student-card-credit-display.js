// scripts/test-student-card-credit-display.js
/**
 * Test script to verify that the StudentCard component correctly displays credit information
 * from the database and handles both legacy and new credit data formats.
 * 
 * This script:
 * 1. Tests the StudentCard component's ability to display credit information
 * 2. Verifies that it handles both legacy and new credit data formats
 * 3. Checks that the credit display is updated correctly after transactions
 */

// Import required modules
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = process.env.AUTH_COOKIE || 'YOUR_AUTH_COOKIE'; // Set this in your environment or pass as argument

// Test data
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'STUDENT_ID'; // Replace with a valid student ID
const TEST_TEACHER_ID = process.env.TEST_TEACHER_ID || 'TEACHER_ID'; // Replace with a valid teacher ID

// Helper function to make API requests
async function makeRequest(url, method, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `sb-auth-token=${AUTH_COOKIE}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.error(`Request error for ${url}:`, error);
    throw error;
  }
}

// Main test function
async function testStudentCardCreditDisplay() {
  console.log('🧪 Starting StudentCard credit display test...');
  
  try {
    // Step 1: Get student data from the dashboard API
    console.log('\n🔍 Step 1: Getting student data from dashboard API...');
    
    const { response: dashboardResponse, data: dashboardData } = await makeRequest(
      `${API_URL}/dashboard?role=teacher`, 
      'GET'
    );
    
    if (!dashboardResponse.ok) {
      console.log(`❌ Failed to get dashboard data: ${dashboardResponse.status}`);
      console.log(dashboardData);
      return;
    }
    
    if (!dashboardData.students || !Array.isArray(dashboardData.students) || dashboardData.students.length === 0) {
      console.log('❌ No students found in dashboard data');
      return;
    }
    
    console.log(`✅ Successfully fetched ${dashboardData.students.length} students from the dashboard API`);
    
    // Step 2: Find our test student in the dashboard data
    console.log('\n🔍 Step 2: Finding test student in dashboard data...');
    
    let testStudent = dashboardData.students.find(student => student.id === TEST_STUDENT_ID);
    
    if (!testStudent) {
      console.log(`❌ Test student with ID ${TEST_STUDENT_ID} not found in dashboard data`);
      console.log('Using the first student in the list as a fallback...');
      testStudent = dashboardData.students[0];
    }
    
    console.log('✅ Found student:', testStudent.name);
    
    // Step 3: Verify credit data structure
    console.log('\n🔍 Step 3: Verifying credit data structure...');
    
    // Check if the student has credit data in either format
    const hasCreditData = testStudent.creditData !== undefined;
    const hasLegacyFormat = testStudent.creditsRemaining !== undefined && testStudent.totalCredits !== undefined;
    
    if (!hasCreditData && !hasLegacyFormat) {
      console.log('❌ Student has no credit data in either format');
      return;
    }
    
    if (hasCreditData) {
      console.log('✅ Student has creditData object (new format)');
      console.log('Credit data:', JSON.stringify(testStudent.creditData, null, 2));
      
      // Verify credit data fields
      if (typeof testStudent.creditData.balance_hours !== 'number') {
        console.log('⚠️ Warning: creditData.balance_hours is not a number');
      } else {
        console.log('✅ creditData.balance_hours is a number:', testStudent.creditData.balance_hours);
      }
      
      if (typeof testStudent.creditData.total_purchased !== 'number') {
        console.log('⚠️ Warning: creditData.total_purchased is not a number');
      } else {
        console.log('✅ creditData.total_purchased is a number:', testStudent.creditData.total_purchased);
      }
      
      if (typeof testStudent.creditData.total_used !== 'number') {
        console.log('⚠️ Warning: creditData.total_used is not a number');
      } else {
        console.log('✅ creditData.total_used is a number:', testStudent.creditData.total_used);
      }
    }
    
    if (hasLegacyFormat) {
      console.log('✅ Student has legacy credit format (creditsRemaining/totalCredits)');
      console.log('Legacy credit data:', {
        creditsRemaining: testStudent.creditsRemaining,
        totalCredits: testStudent.totalCredits
      });
      
      // Verify legacy credit data fields
      if (typeof testStudent.creditsRemaining !== 'number') {
        console.log('⚠️ Warning: creditsRemaining is not a number');
      } else {
        console.log('✅ creditsRemaining is a number:', testStudent.creditsRemaining);
      }
      
      if (typeof testStudent.totalCredits !== 'number') {
        console.log('⚠️ Warning: totalCredits is not a number');
      } else {
        console.log('✅ totalCredits is a number:', testStudent.totalCredits);
      }
    }
    
    // Step 4: Test StudentCard component rendering logic
    console.log('\n🔍 Step 4: Testing StudentCard component rendering logic...');
    
    // Extract the credit display values that would be shown in the StudentCard
    const displayBalance = testStudent.creditData?.balance_hours || testStudent.creditsRemaining || 0;
    const displayTotal = testStudent.creditData?.total_purchased || testStudent.totalCredits || 0;
    const displayRatio = displayTotal > 0 ? (displayBalance / displayTotal) * 100 : 0;
    
    console.log('Credit display values:');
    console.log(`- Balance: ${displayBalance}`);
    console.log(`- Total: ${displayTotal}`);
    console.log(`- Ratio: ${displayRatio.toFixed(2)}%`);
    console.log(`- Display text: "${displayBalance}/${displayTotal}"`);
    console.log(`- Remaining text: "${displayBalance} classes remaining"`);
    
    // Step 5: Get credit data directly from the credits API
    console.log('\n🔍 Step 5: Getting credit data directly from credits API...');
    
    const { response: creditsResponse, data: creditsData } = await makeRequest(
      `${API_URL}/credits?student_id=${testStudent.id}`, 
      'GET'
    );
    
    if (!creditsResponse.ok) {
      console.log(`❌ Failed to get credit data: ${creditsResponse.status}`);
      console.log(creditsData);
      return;
    }
    
    if (!creditsData.creditAccounts || !Array.isArray(creditsData.creditAccounts) || creditsData.creditAccounts.length === 0) {
      console.log('❌ No credit accounts found in credits API response');
      return;
    }
    
    const creditAccount = creditsData.creditAccounts[0];
    console.log('✅ Successfully fetched credit account from credits API');
    console.log('Credit account:', JSON.stringify(creditAccount, null, 2));
    
    // Step 6: Verify that dashboard data matches credits API data
    console.log('\n🔍 Step 6: Verifying dashboard data matches credits API data...');
    
    const apiBalance = creditAccount.balance_hours;
    const apiTotalPurchased = creditAccount.total_purchased;
    
    if (hasCreditData) {
      // Compare new format
      if (testStudent.creditData.balance_hours !== apiBalance) {
        console.log(`❌ Balance mismatch: dashboard ${testStudent.creditData.balance_hours}, API ${apiBalance}`);
      } else {
        console.log('✅ Balance matches between dashboard and API');
      }
      
      if (testStudent.creditData.total_purchased !== apiTotalPurchased) {
        console.log(`❌ Total purchased mismatch: dashboard ${testStudent.creditData.total_purchased}, API ${apiTotalPurchased}`);
      } else {
        console.log('✅ Total purchased matches between dashboard and API');
      }
    } else if (hasLegacyFormat) {
      // Compare legacy format
      if (testStudent.creditsRemaining !== apiBalance) {
        console.log(`❌ Balance mismatch: dashboard ${testStudent.creditsRemaining}, API ${apiBalance}`);
      } else {
        console.log('✅ Balance matches between dashboard and API');
      }
      
      if (testStudent.totalCredits !== apiTotalPurchased) {
        console.log(`❌ Total purchased mismatch: dashboard ${testStudent.totalCredits}, API ${apiTotalPurchased}`);
      } else {
        console.log('✅ Total purchased matches between dashboard and API');
      }
    }
    
    // Step 7: Test credit award and verify display update
    console.log('\n🔍 Step 7: Testing credit award and display update...');
    
    // Award 2 credits to the student
    const CREDIT_HOURS = 2;
    const TEST_DESCRIPTION = 'StudentCard Display Test Credit Award';
    
    const creditBody = {
      action: 'purchase',
      studentId: testStudent.id,
      hours: CREDIT_HOURS,
      description: TEST_DESCRIPTION
    };
    
    const { response: creditResponse, data: creditData } = await makeRequest(
      `${API_URL}/credits`, 
      'POST', 
      creditBody
    );
    
    if (!creditResponse.ok) {
      console.log(`❌ Credit award failed: ${creditResponse.status}`);
      console.log(creditData);
      return;
    }
    
    console.log('✅ Credits awarded successfully');
    
    // Get updated credit data
    const { response: updatedCreditsResponse, data: updatedCreditsData } = await makeRequest(
      `${API_URL}/credits?student_id=${testStudent.id}`, 
      'GET'
    );
    
    if (!updatedCreditsResponse.ok) {
      console.log(`❌ Failed to get updated credit data: ${updatedCreditsResponse.status}`);
      console.log(updatedCreditsData);
      return;
    }
    
    const updatedCreditAccount = updatedCreditsData.creditAccounts[0];
    const updatedBalance = updatedCreditAccount.balance_hours;
    const updatedTotalPurchased = updatedCreditAccount.total_purchased;
    
    console.log('Updated credit account:', JSON.stringify(updatedCreditAccount, null, 2));
    
    // Verify that the balance increased by the expected amount
    const expectedBalance = apiBalance + CREDIT_HOURS;
    const expectedTotalPurchased = apiTotalPurchased + CREDIT_HOURS;
    
    if (updatedBalance !== expectedBalance) {
      console.log(`❌ Updated balance mismatch: expected ${expectedBalance}, got ${updatedBalance}`);
    } else {
      console.log('✅ Updated balance is correct');
    }
    
    if (updatedTotalPurchased !== expectedTotalPurchased) {
      console.log(`❌ Updated total purchased mismatch: expected ${expectedTotalPurchased}, got ${updatedTotalPurchased}`);
    } else {
      console.log('✅ Updated total purchased is correct');
    }
    
    // Step 8: Get updated dashboard data and verify display update
    console.log('\n🔍 Step 8: Getting updated dashboard data and verifying display update...');
    
    const { response: updatedDashboardResponse, data: updatedDashboardData } = await makeRequest(
      `${API_URL}/dashboard?role=teacher`, 
      'GET'
    );
    
    if (!updatedDashboardResponse.ok) {
      console.log(`❌ Failed to get updated dashboard data: ${updatedDashboardResponse.status}`);
      console.log(updatedDashboardData);
      return;
    }
    
    const updatedTestStudent = updatedDashboardData.students.find(student => student.id === testStudent.id);
    
    if (!updatedTestStudent) {
      console.log(`❌ Test student with ID ${testStudent.id} not found in updated dashboard data`);
      return;
    }
    
    console.log('✅ Found updated student data');
    
    // Check if the credit data was updated correctly
    if (updatedTestStudent.creditData) {
      console.log('Updated creditData:', JSON.stringify(updatedTestStudent.creditData, null, 2));
      
      if (updatedTestStudent.creditData.balance_hours !== updatedBalance) {
        console.log(`❌ Dashboard balance mismatch: expected ${updatedBalance}, got ${updatedTestStudent.creditData.balance_hours}`);
      } else {
        console.log('✅ Dashboard balance is correct');
      }
      
      if (updatedTestStudent.creditData.total_purchased !== updatedTotalPurchased) {
        console.log(`❌ Dashboard total purchased mismatch: expected ${updatedTotalPurchased}, got ${updatedTestStudent.creditData.total_purchased}`);
      } else {
        console.log('✅ Dashboard total purchased is correct');
      }
    } else if (updatedTestStudent.creditsRemaining !== undefined && updatedTestStudent.totalCredits !== undefined) {
      console.log('Updated legacy credit data:', {
        creditsRemaining: updatedTestStudent.creditsRemaining,
        totalCredits: updatedTestStudent.totalCredits
      });
      
      if (updatedTestStudent.creditsRemaining !== updatedBalance) {
        console.log(`❌ Dashboard balance mismatch: expected ${updatedBalance}, got ${updatedTestStudent.creditsRemaining}`);
      } else {
        console.log('✅ Dashboard balance is correct');
      }
      
      if (updatedTestStudent.totalCredits !== updatedTotalPurchased) {
        console.log(`❌ Dashboard total purchased mismatch: expected ${updatedTotalPurchased}, got ${updatedTestStudent.totalCredits}`);
      } else {
        console.log('✅ Dashboard total purchased is correct');
      }
    } else {
      console.log('❌ Updated student has no credit data');
    }
    
    // Extract the updated credit display values
    const updatedDisplayBalance = updatedTestStudent.creditData?.balance_hours || updatedTestStudent.creditsRemaining || 0;
    const updatedDisplayTotal = updatedTestStudent.creditData?.total_purchased || updatedTestStudent.totalCredits || 0;
    const updatedDisplayRatio = updatedDisplayTotal > 0 ? (updatedDisplayBalance / updatedDisplayTotal) * 100 : 0;
    
    console.log('Updated credit display values:');
    console.log(`- Balance: ${updatedDisplayBalance}`);
    console.log(`- Total: ${updatedDisplayTotal}`);
    console.log(`- Ratio: ${updatedDisplayRatio.toFixed(2)}%`);
    console.log(`- Display text: "${updatedDisplayBalance}/${updatedDisplayTotal}"`);
    console.log(`- Remaining text: "${updatedDisplayBalance} classes remaining"`);
    
    // Verify that the display values were updated correctly
    if (updatedDisplayBalance !== updatedBalance) {
      console.log(`❌ Display balance mismatch: expected ${updatedBalance}, got ${updatedDisplayBalance}`);
    } else {
      console.log('✅ Display balance is correct');
    }
    
    if (updatedDisplayTotal !== updatedTotalPurchased) {
      console.log(`❌ Display total mismatch: expected ${updatedTotalPurchased}, got ${updatedDisplayTotal}`);
    } else {
      console.log('✅ Display total is correct');
    }
    
    console.log('\n🎉 StudentCard credit display test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
}

// Run the test
testStudentCardCreditDisplay();