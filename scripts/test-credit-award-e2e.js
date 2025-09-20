// End-to-End test script for credit award functionality
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE'; // Replace with a valid auth cookie for a teacher account

// Test data - these need to be replaced with valid values from your database
const TEST_STUDENT_ID = 'STUDENT_ID'; // Replace with a valid student ID
const TEST_PARENT_EMAIL = 'parent@example.com'; // Replace with a valid parent email
const CREDIT_HOURS = 5;
const PAYMENT_AMOUNT = 2500;
const TEST_DESCRIPTION = 'E2E Test Credit Award';

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

// Test the full end-to-end flow
async function testCreditAwardE2E() {
  console.log('🧪 Starting E2E credit award functionality test...');
  
  try {
    // Step 1: Get initial credit balance
    console.log('\n🔍 Step 1: Getting initial credit balance...');
    
    const { response: initialBalanceResponse, data: initialBalanceData } = await makeRequest(
      `${API_URL}/credits?student_id=${TEST_STUDENT_ID}`, 
      'GET'
    );
    
    if (!initialBalanceResponse.ok) {
      console.log(`❌ Failed to get initial credit balance: ${initialBalanceResponse.status}`);
      console.log(initialBalanceData);
      return;
    }
    
    const initialCreditAccount = initialBalanceData.creditAccounts?.[0];
    const initialBalance = initialCreditAccount?.balance_hours || 0;
    const initialTotalPurchased = initialCreditAccount?.total_purchased || 0;
    
    console.log(`Initial credit balance: ${initialBalance}`);
    console.log(`Initial total purchased: ${initialTotalPurchased}`);
    
    // Step 2: Get initial payment records
    console.log('\n🔍 Step 2: Getting initial payment records...');
    
    const { response: initialPaymentsResponse, data: initialPaymentsData } = await makeRequest(
      `${API_URL}/payments`, 
      'GET'
    );
    
    if (!initialPaymentsResponse.ok) {
      console.log(`❌ Failed to get initial payment records: ${initialPaymentsResponse.status}`);
      console.log(initialPaymentsData);
      return;
    }
    
    const initialPaymentsCount = initialPaymentsData.payments?.length || 0;
    console.log(`Initial payment records count: ${initialPaymentsCount}`);
    
    // Step 3: Create payment record and award credits in one step (simulating the UI flow)
    console.log('\n🔍 Step 3: Creating payment record...');
    
    const paymentBody = {
      action: 'award_credits',
      parent_email: TEST_PARENT_EMAIL,
      credit_hours: CREDIT_HOURS,
      payment_amount: PAYMENT_AMOUNT,
      payment_note: TEST_DESCRIPTION,
      student_id: TEST_STUDENT_ID
    };
    
    const { response: paymentResponse, data: paymentData } = await makeRequest(
      `${API_URL}/payments`, 
      'POST', 
      paymentBody
    );
    
    console.log(`Payment API Status: ${paymentResponse.status}`);
    console.log('Payment API Response:', JSON.stringify(paymentData, null, 2));
    
    if (!paymentResponse.ok) {
      console.log('❌ Payment creation failed');
      return;
    }
    
    console.log('✅ Payment record created successfully');
    
    // Step 4: Award credits
    console.log('\n🔍 Step 4: Awarding credits...');
    
    const creditBody = {
      action: 'purchase',
      studentId: TEST_STUDENT_ID,
      hours: CREDIT_HOURS,
      description: TEST_DESCRIPTION,
      referenceType: 'payment',
      referenceId: paymentData.payment?.id // This might be null if the API doesn't return it
    };
    
    const { response: creditResponse, data: creditData } = await makeRequest(
      `${API_URL}/credits`, 
      'POST', 
      creditBody
    );
    
    console.log(`Credits API Status: ${creditResponse.status}`);
    console.log('Credits API Response:', JSON.stringify(creditData, null, 2));
    
    if (!creditResponse.ok) {
      console.log('❌ Credit award failed');
      return;
    }
    
    console.log('✅ Credits awarded successfully');
    
    // Step 5: Verify updated credit balance
    console.log('\n🔍 Step 5: Verifying updated credit balance...');
    
    const { response: updatedBalanceResponse, data: updatedBalanceData } = await makeRequest(
      `${API_URL}/credits?student_id=${TEST_STUDENT_ID}`, 
      'GET'
    );
    
    if (!updatedBalanceResponse.ok) {
      console.log(`❌ Failed to get updated credit balance: ${updatedBalanceResponse.status}`);
      console.log(updatedBalanceData);
      return;
    }
    
    const updatedCreditAccount = updatedBalanceData.creditAccounts?.[0];
    const updatedBalance = updatedCreditAccount?.balance_hours || 0;
    const updatedTotalPurchased = updatedCreditAccount?.total_purchased || 0;
    
    console.log(`Updated credit balance: ${updatedBalance}`);
    console.log(`Updated total purchased: ${updatedTotalPurchased}`);
    
    // Check if balance increased by the expected amount
    const expectedBalance = initialBalance + CREDIT_HOURS;
    const expectedTotalPurchased = initialTotalPurchased + CREDIT_HOURS;
    
    if (updatedBalance !== expectedBalance) {
      console.log(`❌ Credit balance mismatch: expected ${expectedBalance}, got ${updatedBalance}`);
    } else {
      console.log('✅ Credit balance updated correctly');
    }
    
    if (updatedTotalPurchased !== expectedTotalPurchased) {
      console.log(`❌ Total purchased mismatch: expected ${expectedTotalPurchased}, got ${updatedTotalPurchased}`);
    } else {
      console.log('✅ Total purchased updated correctly');
    }
    
    // Step 6: Verify credit transaction
    console.log('\n🔍 Step 6: Verifying credit transaction...');
    
    const recentTransaction = updatedBalanceData.transactions?.[0];
    if (!recentTransaction) {
      console.log('❌ No recent transaction found');
      return;
    }
    
    console.log('Most recent transaction:');
    console.log(`- Type: ${recentTransaction.transaction_type}`);
    console.log(`- Amount: ${recentTransaction.hours_amount}`);
    console.log(`- Balance after: ${recentTransaction.balance_after}`);
    console.log(`- Description: ${recentTransaction.description}`);
    console.log(`- Reference type: ${recentTransaction.reference_type}`);
    console.log(`- Reference ID: ${recentTransaction.reference_id}`);
    
    // Verify transaction details
    if (recentTransaction.transaction_type !== 'purchase') {
      console.log(`❌ Transaction type mismatch: expected 'purchase', got '${recentTransaction.transaction_type}'`);
    } else {
      console.log('✅ Transaction type is correct');
    }
    
    if (recentTransaction.hours_amount !== CREDIT_HOURS) {
      console.log(`❌ Transaction amount mismatch: expected ${CREDIT_HOURS}, got ${recentTransaction.hours_amount}`);
    } else {
      console.log('✅ Transaction amount is correct');
    }
    
    if (recentTransaction.balance_after !== updatedBalance) {
      console.log(`❌ Transaction balance mismatch: expected ${updatedBalance}, got ${recentTransaction.balance_after}`);
    } else {
      console.log('✅ Transaction balance is correct');
    }
    
    if (recentTransaction.reference_type !== 'payment') {
      console.log(`❌ Reference type mismatch: expected 'payment', got '${recentTransaction.reference_type}'`);
    } else {
      console.log('✅ Reference type is correct');
    }
    
    // Step 7: Verify updated payment records
    console.log('\n🔍 Step 7: Verifying updated payment records...');
    
    const { response: updatedPaymentsResponse, data: updatedPaymentsData } = await makeRequest(
      `${API_URL}/payments`, 
      'GET'
    );
    
    if (!updatedPaymentsResponse.ok) {
      console.log(`❌ Failed to get updated payment records: ${updatedPaymentsResponse.status}`);
      console.log(updatedPaymentsData);
      return;
    }
    
    const updatedPaymentsCount = updatedPaymentsData.payments?.length || 0;
    console.log(`Updated payment records count: ${updatedPaymentsCount}`);
    
    // Check if a new payment record was added
    if (updatedPaymentsCount <= initialPaymentsCount) {
      console.log(`❌ No new payment record found: initial ${initialPaymentsCount}, updated ${updatedPaymentsCount}`);
    } else {
      console.log('✅ New payment record added');
    }
    
    // Check the most recent payment
    const recentPayment = updatedPaymentsData.payments?.[0];
    if (!recentPayment) {
      console.log('❌ No recent payment found');
      return;
    }
    
    console.log('Most recent payment:');
    console.log(`- Amount: ${recentPayment.amount}`);
    console.log(`- Status: ${recentPayment.status}`);
    console.log(`- Date: ${recentPayment.payment_date}`);
    console.log(`- Student ID: ${recentPayment.student_id}`);
    
    // Verify payment details
    if (recentPayment.amount !== PAYMENT_AMOUNT) {
      console.log(`❌ Payment amount mismatch: expected ${PAYMENT_AMOUNT}, got ${recentPayment.amount}`);
    } else {
      console.log('✅ Payment amount is correct');
    }
    
    if (recentPayment.status !== 'paid') {
      console.log(`❌ Payment status mismatch: expected 'paid', got '${recentPayment.status}'`);
    } else {
      console.log('✅ Payment status is correct');
    }
    
    if (recentPayment.student_id !== TEST_STUDENT_ID) {
      console.log(`❌ Student ID mismatch: expected ${TEST_STUDENT_ID}, got ${recentPayment.student_id}`);
    } else {
      console.log('✅ Student ID is correct');
    }
    
    console.log('\n🎉 E2E test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
}

// Run the test
testCreditAwardE2E();