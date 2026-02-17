// Test script for credit deduction logic
// This script tests the new automatic credit deduction system for class completion

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const TEST_TEACHER_EMAIL = 'teacher@test.com';
const TEST_STUDENT_EMAIL = 'student@test.com';
const TEST_PARENT_EMAIL = 'parent@test.com';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to create test data
async function createTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Try to find existing profiles first
    let teacher, parent, student;

    // Look for existing teacher
    const { data: existingTeacher } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'teacher')
      .limit(1)
      .single();

    if (existingTeacher) {
      teacher = existingTeacher;
      console.log('✅ Using existing teacher:', teacher.email);
    } else {
      // Create new teacher if none exists
      const { data: newTeacher, error: teacherError } = await supabase
        .from('profiles')
        .insert({
          email: TEST_TEACHER_EMAIL,
          full_name: 'Test Teacher',
          role: 'teacher'
        })
        .select()
        .single();

      if (teacherError) throw teacherError;
      teacher = newTeacher;
    }

    // Look for existing parent
    const { data: existingParent } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parent')
      .limit(1)
      .single();

    if (existingParent) {
      parent = existingParent;
      console.log('✅ Using existing parent:', parent.email);
    } else {
      // Create new parent if none exists
      const { data: newParent, error: parentError } = await supabase
        .from('profiles')
        .insert({
          email: TEST_PARENT_EMAIL,
          full_name: 'Test Parent',
          role: 'parent'
        })
        .select()
        .single();

      if (parentError) throw parentError;
      parent = newParent;
    }

    // Look for existing student
    const { data: existingStudent } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .eq('parent_id', parent.id)
      .limit(1)
      .single();

    if (existingStudent) {
      student = existingStudent;
      console.log('✅ Using existing student:', student.email);
    } else {
      // Create new student if none exists
      const { data: newStudent, error: studentError } = await supabase
        .from('profiles')
        .insert({
          email: TEST_STUDENT_EMAIL,
          full_name: 'Test Student',
          role: 'student',
          parent_id: parent.id
        })
        .select()
        .single();

      if (studentError) throw studentError;
      student = newStudent;
    }

    // Create or get credit account
    const { data: creditAccount, error: creditError } = await supabase
      .from('credits')
      .upsert({
        student_id: student.id,
        teacher_id: teacher.id,
        parent_id: parent.id,
        balance_hours: 5.0,
        total_purchased: 10.0,
        total_used: 5.0,
        is_active: true,
        rate_per_hour: 150
      }, { onConflict: 'student_id,teacher_id' })
      .select()
      .single();

    if (creditError) throw creditError;

    console.log('✅ Test data created successfully');
    return { teacher, student, parent, creditAccount };
  } catch (error) {
    console.error('❌ Failed to create test data:', error.message);
    throw error;
  }
}

// Helper function to create a test class log
async function createTestClassLog(teacherId, studentId, durationMinutes = 60, status = 'in_progress') {
  const { data: classLog, error } = await supabase
    .from('class_logs')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      date: new Date().toISOString().split('T')[0],
      content: 'Test class for credit deduction',
      status: status,
      duration_minutes: durationMinutes,
      start_time: new Date().toISOString(),
      student_email: TEST_STUDENT_EMAIL
    })
    .select()
    .single();

  if (error) throw error;
  return classLog;
}

// Test 1: Full credit deduction with sufficient balance
async function testFullCreditDeduction() {
  console.log('\n1️⃣ Testing full credit deduction with sufficient balance...');
  
  try {
    const { teacher, student, creditAccount } = await createTestData();
    
    // Ensure sufficient balance
    await supabase
      .from('credits')
      .update({ balance_hours: 5.0 })
      .eq('id', creditAccount.id);

    // Create a test class log
    const classLog = await createTestClassLog(teacher.id, student.id, 60); // 1 hour class
    
    // Test the credit deduction function
    const { data: result, error } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error) throw error;

    // Verify the result
    if (result.success && 
        result.credits_deducted === 1.0 && 
        result.payment_status === 'paid' && 
        result.is_paid === true) {
      console.log('   ✅ Full credit deduction test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ Full credit deduction test failed');
      console.log('   Result:', result);
      testResults.failed++;
      testResults.errors.push('Full credit deduction test failed');
    }

    // Verify class log was updated
    const { data: updatedClassLog } = await supabase
      .from('class_logs')
      .select('*')
      .eq('id', classLog.id)
      .single();

    if (updatedClassLog.credits_deducted === 1.0 && 
        updatedClassLog.is_paid === true && 
        updatedClassLog.payment_status === 'paid') {
      console.log('   ✅ Class log updated correctly');
      testResults.passed++;
    } else {
      console.log('   ❌ Class log not updated correctly');
      console.log('   Class log:', updatedClassLog);
      testResults.failed++;
      testResults.errors.push('Class log update failed');
    }

  } catch (error) {
    console.log('   ❌ Full credit deduction test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Full credit deduction test error: ${error.message}`);
  }
}

// Test 2: Partial credit deduction with insufficient balance
async function testPartialCreditDeduction() {
  console.log('\n2️⃣ Testing partial credit deduction with insufficient balance...');
  
  try {
    const { teacher, student, creditAccount } = await createTestData();
    
    // Set insufficient balance (0.5 hours for a 1 hour class)
    await supabase
      .from('credits')
      .update({ balance_hours: 0.5 })
      .eq('id', creditAccount.id);

    // Create a test class log
    const classLog = await createTestClassLog(teacher.id, student.id, 60); // 1 hour class
    
    // Test the credit deduction function
    const { data: result, error } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error) throw error;

    // Verify the result
    if (result.success && 
        result.credits_deducted === 0.5 && 
        result.payment_status === 'partial' && 
        result.is_paid === false) {
      console.log('   ✅ Partial credit deduction test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ Partial credit deduction test failed');
      console.log('   Result:', result);
      testResults.failed++;
      testResults.errors.push('Partial credit deduction test failed');
    }

  } catch (error) {
    console.log('   ❌ Partial credit deduction test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Partial credit deduction test error: ${error.message}`);
  }
}

// Test 3: Zero balance scenario
async function testZeroBalanceScenario() {
  console.log('\n3️⃣ Testing zero balance scenario...');
  
  try {
    const { teacher, student, creditAccount } = await createTestData();
    
    // Set zero balance
    await supabase
      .from('credits')
      .update({ balance_hours: 0.0 })
      .eq('id', creditAccount.id);

    // Create a test class log
    const classLog = await createTestClassLog(teacher.id, student.id, 60); // 1 hour class
    
    // Test the credit deduction function
    const { data: result, error } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error) throw error;

    // Verify the result
    if (result.success && 
        result.credits_deducted === 0 && 
        result.payment_status === 'unpaid' && 
        result.is_paid === false) {
      console.log('   ✅ Zero balance test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ Zero balance test failed');
      console.log('   Result:', result);
      testResults.failed++;
      testResults.errors.push('Zero balance test failed');
    }

  } catch (error) {
    console.log('   ❌ Zero balance test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Zero balance test error: ${error.message}`);
  }
}

// Test 4: Double deduction prevention
async function testDoubleDeductionPrevention() {
  console.log('\n4️⃣ Testing double deduction prevention...');
  
  try {
    const { teacher, student, creditAccount } = await createTestData();
    
    // Set sufficient balance
    await supabase
      .from('credits')
      .update({ balance_hours: 5.0 })
      .eq('id', creditAccount.id);

    // Create a test class log
    const classLog = await createTestClassLog(teacher.id, student.id, 60); // 1 hour class
    
    // First deduction
    const { data: result1, error: error1 } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error1) throw error1;

    // Second deduction attempt (should be prevented)
    const { data: result2, error: error2 } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error2) throw error2;

    // Verify the second attempt was prevented
    if (result2.success && 
        result2.already_processed === true && 
        result2.credits_deducted === 1.0) { // Should return the original deduction amount
      console.log('   ✅ Double deduction prevention test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ Double deduction prevention test failed');
      console.log('   Result 1:', result1);
      console.log('   Result 2:', result2);
      testResults.failed++;
      testResults.errors.push('Double deduction prevention test failed');
    }

  } catch (error) {
    console.log('   ❌ Double deduction prevention test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Double deduction prevention test error: ${error.message}`);
  }
}

// Test 5: No credit account scenario
async function testNoCreditAccountScenario() {
  console.log('\n5️⃣ Testing no credit account scenario...');
  
  try {
    const { teacher, student } = await createTestData();
    
    // Delete the credit account
    await supabase
      .from('credits')
      .delete()
      .eq('student_id', student.id)
      .eq('teacher_id', teacher.id);

    // Create a test class log
    const classLog = await createTestClassLog(teacher.id, student.id, 60); // 1 hour class
    
    // Test the credit deduction function
    const { data: result, error } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: classLog.id });

    if (error) throw error;

    // Verify the result
    if (result.success && 
        result.credits_deducted === 0 && 
        result.payment_status === 'unpaid' && 
        result.available_credits === 0) {
      console.log('   ✅ No credit account test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ No credit account test failed');
      console.log('   Result:', result);
      testResults.failed++;
      testResults.errors.push('No credit account test failed');
    }

  } catch (error) {
    console.log('   ❌ No credit account test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`No credit account test error: ${error.message}`);
  }
}

// Test 6: Class completion trigger integration
async function testClassCompletionTrigger() {
  console.log('\n6️⃣ Testing class completion trigger integration...');
  
  try {
    const { teacher, student, creditAccount } = await createTestData();
    
    // Set sufficient balance
    await supabase
      .from('credits')
      .update({ balance_hours: 3.0 })
      .eq('id', creditAccount.id);

    // Create a test class log in 'in_progress' status
    const classLog = await createTestClassLog(teacher.id, student.id, 90, 'in_progress'); // 1.5 hour class
    
    // Update the class to 'completed' status (should trigger credit deduction)
    await supabase
      .from('class_logs')
      .update({ 
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', classLog.id);

    // Wait a moment for the trigger to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if credits were deducted
    const { data: updatedClassLog } = await supabase
      .from('class_logs')
      .select('*')
      .eq('id', classLog.id)
      .single();

    if (updatedClassLog.credits_deducted === 1.5 && 
        updatedClassLog.is_paid === true && 
        updatedClassLog.payment_status === 'paid') {
      console.log('   ✅ Class completion trigger test passed');
      testResults.passed++;
    } else {
      console.log('   ❌ Class completion trigger test failed');
      console.log('   Updated class log:', updatedClassLog);
      testResults.failed++;
      testResults.errors.push('Class completion trigger test failed');
    }

  } catch (error) {
    console.log('   ❌ Class completion trigger test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Class completion trigger test error: ${error.message}`);
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test class logs
    await supabase
      .from('class_logs')
      .delete()
      .eq('content', 'Test class for credit deduction');

    // Delete test credit transactions
    await supabase
      .from('credit_transactions')
      .delete()
      .like('description', '%Test%');

    // Reset credit accounts
    await supabase
      .from('credits')
      .delete()
      .in('student_id', [
        (await supabase.from('profiles').select('id').eq('email', TEST_STUDENT_EMAIL).single()).data?.id
      ].filter(Boolean));

    // Delete test profiles
    await supabase
      .from('profiles')
      .delete()
      .in('email', [TEST_TEACHER_EMAIL, TEST_STUDENT_EMAIL, TEST_PARENT_EMAIL]);

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️ Cleanup error (non-critical):', error.message);
  }
}

// Main test function
async function runCreditDeductionTests() {
  console.log('🧪 Starting Credit Deduction Logic Tests...');
  console.log('=' .repeat(60));

  try {
    // Run all tests
    await testFullCreditDeduction();
    await testPartialCreditDeduction();
    await testZeroBalanceScenario();
    await testDoubleDeductionPrevention();
    await testNoCreditAccountScenario();
    await testClassCompletionTrigger();

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test Results Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);

    if (testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Credit deduction logic is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  } finally {
    await cleanup();
  }
}

// Run the tests
runCreditDeductionTests();