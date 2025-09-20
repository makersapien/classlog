// End-to-End test script for schedule slot creation and booking
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api';
const TEACHER_AUTH_COOKIE = 'TEACHER_AUTH_COOKIE'; // Replace with a valid auth cookie for a teacher account
const STUDENT_AUTH_COOKIE = 'STUDENT_AUTH_COOKIE'; // Replace with a valid auth cookie for a student account

// Test data - these need to be replaced with valid values from your database
const TEST_TEACHER_ID = 'TEACHER_ID'; // Replace with a valid teacher ID
const TEST_STUDENT_ID = 'STUDENT_ID'; // Replace with a valid student ID

// Test slot data
const TEST_SLOT = {
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  start_time: '10:00:00',
  end_time: '11:00:00',
  title: 'E2E Test Slot',
  description: 'Test slot for end-to-end testing',
  subject: 'Test Subject',
  duration_minutes: 60,
  max_students: 1,
  google_meet_url: 'https://meet.google.com/test-meeting-url'
};

// Helper function to make API requests
async function makeRequest(url, method, body = null, authCookie = TEACHER_AUTH_COOKIE) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `sb-auth-token=${authCookie}`
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
async function testScheduleSlotE2E() {
  console.log('🧪 Starting E2E schedule slot creation and booking test...');
  let createdSlotId = null;
  
  try {
    // Step 1: Get initial schedule slots for the teacher
    console.log('\n🔍 Step 1: Getting initial schedule slots...');
    
    const { response: initialSlotsResponse, data: initialSlotsData } = await makeRequest(
      `${API_URL}/schedule-slots?teacher_id=${TEST_TEACHER_ID}`, 
      'GET'
    );
    
    if (!initialSlotsResponse.ok) {
      console.log(`❌ Failed to get initial schedule slots: ${initialSlotsResponse.status}`);
      console.log(initialSlotsData);
      return;
    }
    
    const initialSlotsCount = initialSlotsData.slots?.length || 0;
    console.log(`Initial schedule slots count: ${initialSlotsCount}`);
    
    // Step 2: Create a new schedule slot as a teacher
    console.log('\n🔍 Step 2: Creating a new schedule slot...');
    
    const { response: createSlotResponse, data: createSlotData } = await makeRequest(
      `${API_URL}/schedule-slots`, 
      'POST', 
      TEST_SLOT
    );
    
    console.log(`Create Slot API Status: ${createSlotResponse.status}`);
    console.log('Create Slot API Response:', JSON.stringify(createSlotData, null, 2));
    
    if (!createSlotResponse.ok) {
      console.log('❌ Schedule slot creation failed');
      return;
    }
    
    createdSlotId = createSlotData.slot?.id;
    if (!createdSlotId) {
      console.log('❌ No slot ID returned from creation API');
      return;
    }
    
    console.log(`✅ Schedule slot created successfully with ID: ${createdSlotId}`);
    
    // Step 3: Verify the slot was created by getting updated slots
    console.log('\n🔍 Step 3: Verifying slot creation...');
    
    const { response: updatedSlotsResponse, data: updatedSlotsData } = await makeRequest(
      `${API_URL}/schedule-slots?teacher_id=${TEST_TEACHER_ID}`, 
      'GET'
    );
    
    if (!updatedSlotsResponse.ok) {
      console.log(`❌ Failed to get updated schedule slots: ${updatedSlotsResponse.status}`);
      console.log(updatedSlotsData);
      return;
    }
    
    const updatedSlotsCount = updatedSlotsData.slots?.length || 0;
    console.log(`Updated schedule slots count: ${updatedSlotsCount}`);
    
    // Check if a new slot was added
    if (updatedSlotsCount <= initialSlotsCount) {
      console.log(`❌ No new slot found: initial ${initialSlotsCount}, updated ${updatedSlotsCount}`);
      return;
    }
    
    // Find our created slot in the list
    const createdSlot = updatedSlotsData.slots.find(slot => slot.id === createdSlotId);
    if (!createdSlot) {
      console.log('❌ Created slot not found in the updated slots list');
      return;
    }
    
    console.log('✅ Created slot found in the updated slots list');
    console.log('Slot details:');
    console.log(`- Title: ${createdSlot.title}`);
    console.log(`- Date: ${createdSlot.date}`);
    console.log(`- Time: ${createdSlot.start_time} - ${createdSlot.end_time}`);
    console.log(`- Status: ${createdSlot.status}`);
    
    // Verify slot details
    if (createdSlot.status !== 'available') {
      console.log(`❌ Slot status mismatch: expected 'available', got '${createdSlot.status}'`);
      return;
    }
    
    // Step 4: Get student's initial credit balance
    console.log('\n🔍 Step 4: Getting student\'s initial credit balance...');
    
    const { response: initialCreditsResponse, data: initialCreditsData } = await makeRequest(
      `${API_URL}/credits?student_id=${TEST_STUDENT_ID}`, 
      'GET',
      null,
      STUDENT_AUTH_COOKIE
    );
    
    if (!initialCreditsResponse.ok) {
      console.log(`❌ Failed to get initial credit balance: ${initialCreditsResponse.status}`);
      console.log(initialCreditsData);
      return;
    }
    
    const initialCreditAccount = initialCreditsData.creditAccounts?.[0];
    if (!initialCreditAccount) {
      console.log('❌ No credit account found for the student');
      return;
    }
    
    const initialBalance = initialCreditAccount.balance_hours || 0;
    console.log(`Initial credit balance: ${initialBalance}`);
    
    if (initialBalance < 1) {
      console.log('⚠️ Warning: Student has insufficient credits to book a slot');
      console.log('Consider adding credits before running this test');
      return;
    }
    
    // Step 5: Book the slot as a student
    console.log('\n🔍 Step 5: Booking the slot as a student...');
    
    const bookingBody = {
      student_id: TEST_STUDENT_ID
    };
    
    const { response: bookingResponse, data: bookingData } = await makeRequest(
      `${API_URL}/schedule-slots/${createdSlotId}/book`, 
      'POST', 
      bookingBody,
      STUDENT_AUTH_COOKIE
    );
    
    console.log(`Booking API Status: ${bookingResponse.status}`);
    console.log('Booking API Response:', JSON.stringify(bookingData, null, 2));
    
    if (!bookingResponse.ok) {
      console.log('❌ Slot booking failed');
      return;
    }
    
    console.log('✅ Slot booked successfully');
    
    // Step 6: Verify the slot was booked
    console.log('\n🔍 Step 6: Verifying slot booking...');
    
    const { response: bookedSlotResponse, data: bookedSlotData } = await makeRequest(
      `${API_URL}/schedule-slots?teacher_id=${TEST_TEACHER_ID}`, 
      'GET',
      null,
      TEACHER_AUTH_COOKIE
    );
    
    if (!bookedSlotResponse.ok) {
      console.log(`❌ Failed to get updated slot: ${bookedSlotResponse.status}`);
      console.log(bookedSlotData);
      return;
    }
    
    // Find our booked slot in the list
    const bookedSlot = bookedSlotData.slots.find(slot => slot.id === createdSlotId);
    if (!bookedSlot) {
      console.log('❌ Booked slot not found in the slots list');
      return;
    }
    
    console.log('Booked slot details:');
    console.log(`- Title: ${bookedSlot.title}`);
    console.log(`- Date: ${bookedSlot.date}`);
    console.log(`- Time: ${bookedSlot.start_time} - ${bookedSlot.end_time}`);
    console.log(`- Status: ${bookedSlot.status}`);
    console.log(`- Booked by: ${bookedSlot.booked_by}`);
    
    // Verify slot status
    if (bookedSlot.status !== 'booked') {
      console.log(`❌ Slot status mismatch: expected 'booked', got '${bookedSlot.status}'`);
      return;
    }
    
    if (bookedSlot.booked_by !== TEST_STUDENT_ID) {
      console.log(`❌ Booked by mismatch: expected '${TEST_STUDENT_ID}', got '${bookedSlot.booked_by}'`);
      return;
    }
    
    console.log('✅ Slot status and booked_by are correct');
    
    // Step 7: Verify student's updated credit balance
    console.log('\n🔍 Step 7: Verifying student\'s updated credit balance...');
    
    const { response: updatedCreditsResponse, data: updatedCreditsData } = await makeRequest(
      `${API_URL}/credits?student_id=${TEST_STUDENT_ID}`, 
      'GET',
      null,
      STUDENT_AUTH_COOKIE
    );
    
    if (!updatedCreditsResponse.ok) {
      console.log(`❌ Failed to get updated credit balance: ${updatedCreditsResponse.status}`);
      console.log(updatedCreditsData);
      return;
    }
    
    const updatedCreditAccount = updatedCreditsData.creditAccounts?.[0];
    if (!updatedCreditAccount) {
      console.log('❌ No updated credit account found for the student');
      return;
    }
    
    const updatedBalance = updatedCreditAccount.balance_hours || 0;
    console.log(`Updated credit balance: ${updatedBalance}`);
    
    // Check if balance decreased by 1
    const expectedBalance = initialBalance - 1;
    if (updatedBalance !== expectedBalance) {
      console.log(`❌ Credit balance mismatch: expected ${expectedBalance}, got ${updatedBalance}`);
      return;
    }
    
    console.log('✅ Credit balance updated correctly');
    
    // Step 8: Verify credit transaction
    console.log('\n🔍 Step 8: Verifying credit transaction...');
    
    const recentTransaction = updatedCreditsData.transactions?.[0];
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
    if (recentTransaction.transaction_type !== 'deduction') {
      console.log(`❌ Transaction type mismatch: expected 'deduction', got '${recentTransaction.transaction_type}'`);
      return;
    }
    
    if (recentTransaction.hours_amount !== 1) {
      console.log(`❌ Transaction amount mismatch: expected 1, got ${recentTransaction.hours_amount}`);
      return;
    }
    
    if (recentTransaction.balance_after !== updatedBalance) {
      console.log(`❌ Transaction balance mismatch: expected ${updatedBalance}, got ${recentTransaction.balance_after}`);
      return;
    }
    
    if (recentTransaction.reference_type !== 'schedule_slot') {
      console.log(`❌ Reference type mismatch: expected 'schedule_slot', got '${recentTransaction.reference_type}'`);
      return;
    }
    
    if (recentTransaction.reference_id !== createdSlotId) {
      console.log(`❌ Reference ID mismatch: expected '${createdSlotId}', got '${recentTransaction.reference_id}'`);
      return;
    }
    
    console.log('✅ Transaction details are correct');
    
    console.log('\n🎉 E2E test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
}

// Run the test
testScheduleSlotE2E();