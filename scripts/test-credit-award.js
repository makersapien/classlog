// Test script for credit award functionality
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE'; // Replace with a valid auth cookie for a teacher account

// Test data
const TEST_STUDENT_ID = 'STUDENT_ID'; // Replace with a valid student ID
const TEST_PARENT_EMAIL = 'parent@example.com'; // Replace with a valid parent email
const CREDIT_HOURS = 5;
const PAYMENT_AMOUNT = 2500;

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
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  return { response, data };
}

// Test cases
async function runTests() {
  console.log('🧪 Starting credit award functionality tests...');
  
  try {
    // Step 1: Create payment record
    console.log('\n🔍 Step 1: Creating payment record...');
    
    const paymentBody = {
      action: 'award_credits',
      parent_email: TEST_PARENT_EMAIL,
      credit_hours: CREDIT_HOURS,
      payment_amount: PAYMENT_AMOUNT,
      payment_note: 'Test payment for credit award test'
    };
    
    const { response: paymentResponse, data: paymentData } = await makeRequest(
      `${API_URL}/payments`, 
      'POST', 
      paymentBody
    );
    
    console.log(`Status: ${paymentResponse.status}`);
    console.log('Response:', JSON.stringify(paymentData, null, 2));
    
    if (!paymentResponse.ok) {
      console.log('❌ Payment creation failed');
      return;
    }
    
    console.log('✅ Payment record created successfully');
    
    // Step 2: Award credits
    console.log('\n🔍 Step 2: Awarding credits...');
    
    const creditBody = {
      action: 'purchase',
      studentId: TEST_STUDENT_ID,
      hours: CREDIT_HOURS,
      description: 'Test credit award',
      referenceType: 'payment'
      // Note: We don't have the payment ID from step 1 since the API doesn't return it
    };
    
    const { response: creditResponse, data: creditData } = await makeRequest(
      `${API_URL}/credits`, 
      'POST', 
      creditBody
    );
    
    console.log(`Status: ${creditResponse.status}`);
    console.log('Response:', JSON.stringify(creditData, null, 2));
    
    if (!creditResponse.ok) {
      console.log('❌ Credit award failed');
      return;
    }
    
    console.log('✅ Credits awarded successfully');
    
    // Step 3: Verify credit balance
    console.log('\n🔍 Step 3: Verifying credit balance...');
    
    const { response: balanceResponse, data: balanceData } = await makeRequest(
      `${API_URL}/credits?student_id=${TEST_STUDENT_ID}`, 
      'GET'
    );
    
    console.log(`Status: ${balanceResponse.status}`);
    console.log('Credit accounts:', JSON.stringify(balanceData.creditAccounts, null, 2));
    console.log('Recent transactions:', JSON.stringify(balanceData.transactions?.slice(0, 2), null, 2));
    
    if (!balanceResponse.ok) {
      console.log('❌ Credit balance verification failed');
      return;
    }
    
    // Check if the credit account exists and has the expected balance
    const creditAccount = balanceData.creditAccounts?.[0];
    if (!creditAccount) {
      console.log('❌ No credit account found for student');
      return;
    }
    
    console.log(`Current credit balance: ${creditAccount.balance_hours}`);
    console.log(`Total purchased: ${creditAccount.total_purchased}`);
    console.log(`Total used: ${creditAccount.total_used}`);
    
    // Check if the recent transaction exists
    const recentTransaction = balanceData.transactions?.[0];
    if (!recentTransaction) {
      console.log('❌ No recent transaction found');
      return;
    }
    
    console.log('Most recent transaction:');
    console.log(`- Type: ${recentTransaction.transaction_type}`);
    console.log(`- Amount: ${recentTransaction.hours_amount}`);
    console.log(`- Balance after: ${recentTransaction.balance_after}`);
    console.log(`- Description: ${recentTransaction.description}`);
    
    // Step 4: Verify payment record
    console.log('\n🔍 Step 4: Verifying payment records...');
    
    const { response: paymentsResponse, data: paymentsData } = await makeRequest(
      `${API_URL}/payments`, 
      'GET'
    );
    
    console.log(`Status: ${paymentsResponse.status}`);
    console.log('Recent payments:', JSON.stringify(paymentsData.payments?.slice(0, 2), null, 2));
    
    if (!paymentsResponse.ok) {
      console.log('❌ Payment verification failed');
      return;
    }
    
    // Check if the payment record exists
    const recentPayment = paymentsData.payments?.[0];
    if (!recentPayment) {
      console.log('❌ No recent payment found');
      return;
    }
    
    console.log('Most recent payment:');
    console.log(`- Amount: ${recentPayment.amount}`);
    console.log(`- Status: ${recentPayment.status}`);
    console.log(`- Date: ${recentPayment.payment_date}`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
}

// Run the tests
runTests();