// Simple test script for credit deduction functions
// This script tests if the database functions exist and can be called

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDatabaseFunctions() {
  console.log('🧪 Testing Credit Deduction Database Functions...');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if the credit deduction function exists
    console.log('\n1️⃣ Testing function existence...');
    
    const { data: functions, error: funcError } = await supabase
      .rpc('process_class_credit_deduction', { p_class_log_id: '00000000-0000-0000-0000-000000000000' });

    if (funcError) {
      if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
        console.log('❌ process_class_credit_deduction function does not exist');
      } else if (funcError.message.includes('Class log not found')) {
        console.log('✅ process_class_credit_deduction function exists (expected error for fake ID)');
      } else {
        console.log('⚠️ Unexpected error:', funcError.message);
      }
    } else {
      console.log('✅ process_class_credit_deduction function exists');
    }

    // Test 2: Check if preview function exists
    console.log('\n2️⃣ Testing preview function...');
    
    const { data: previewResult, error: previewError } = await supabase
      .rpc('preview_class_credit_deduction', { p_class_log_id: '00000000-0000-0000-0000-000000000000' });

    if (previewError) {
      if (previewError.message.includes('function') && previewError.message.includes('does not exist')) {
        console.log('❌ preview_class_credit_deduction function does not exist');
      } else if (previewError.message.includes('Class log not found')) {
        console.log('✅ preview_class_credit_deduction function exists (expected error for fake ID)');
      } else {
        console.log('⚠️ Unexpected error:', previewError.message);
      }
    } else {
      console.log('✅ preview_class_credit_deduction function exists');
    }

    // Test 3: Check if partial deduction function exists
    console.log('\n3️⃣ Testing partial deduction function...');
    
    const { data: partialResult, error: partialError } = await supabase
      .rpc('process_partial_credit_deduction', { 
        p_class_log_id: '00000000-0000-0000-0000-000000000000',
        p_max_credits_to_deduct: 1.0
      });

    if (partialError) {
      if (partialError.message.includes('function') && partialError.message.includes('does not exist')) {
        console.log('❌ process_partial_credit_deduction function does not exist');
      } else if (partialError.message.includes('Class log not found')) {
        console.log('✅ process_partial_credit_deduction function exists (expected error for fake ID)');
      } else {
        console.log('⚠️ Unexpected error:', partialError.message);
      }
    } else {
      console.log('✅ process_partial_credit_deduction function exists');
    }

    // Test 4: Check if existing completed classes processing function exists
    console.log('\n4️⃣ Testing existing classes processing function...');
    
    const { data: existingResult, error: existingError } = await supabase
      .rpc('process_existing_completed_classes');

    if (existingError) {
      if (existingError.message.includes('function') && existingError.message.includes('does not exist')) {
        console.log('❌ process_existing_completed_classes function does not exist');
      } else {
        console.log('⚠️ Unexpected error:', existingError.message);
      }
    } else {
      console.log('✅ process_existing_completed_classes function exists');
      console.log(`   Found ${existingResult?.length || 0} classes to process`);
    }

    // Test 5: Check if class_logs table has new columns
    console.log('\n5️⃣ Testing class_logs table structure...');
    
    const { data: classLogs, error: tableError } = await supabase
      .from('class_logs')
      .select('id, credits_deducted, is_paid, payment_status, student_id')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('column') && tableError.message.includes('does not exist')) {
        console.log('❌ New columns not found in class_logs table');
        console.log('   Error:', tableError.message);
      } else {
        console.log('⚠️ Unexpected table error:', tableError.message);
      }
    } else {
      console.log('✅ class_logs table has new payment tracking columns');
      if (classLogs && classLogs.length > 0) {
        const log = classLogs[0];
        console.log('   Sample record:', {
          id: log.id,
          credits_deducted: log.credits_deducted,
          is_paid: log.is_paid,
          payment_status: log.payment_status,
          student_id: log.student_id
        });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Database Function Tests Complete');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the tests
testDatabaseFunctions();