// Script to test if the interactive calendar schema is ready
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables manually
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local file:', error.message);
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSchema() {
  console.log('🧪 Testing Interactive Calendar Database Schema...');
  console.log('=' .repeat(60));
  
  let allReady = true;
  
  // Test 1: Check if new columns exist in schedule_slots
  console.log('\n1️⃣ Testing schedule_slots table enhancements...');
  try {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, assigned_student_id, assigned_student_name, assignment_expiry, assignment_status')
      .limit(1);

    if (error) {
      console.log('❌ New schedule_slots columns not available:', error.message);
      allReady = false;
    } else {
      console.log('✅ New schedule_slots columns are available');
    }
  } catch (error) {
    console.log('❌ Error testing schedule_slots:', error.message);
    allReady = false;
  }

  // Test 2: Check if slot_assignments table exists
  console.log('\n2️⃣ Testing slot_assignments table...');
  try {
    const { data, error } = await supabase
      .from('slot_assignments')
      .select('id, slot_ids, teacher_id, student_id, status')
      .limit(1);

    if (error) {
      console.log('❌ slot_assignments table not available:', error.message);
      allReady = false;
    } else {
      console.log('✅ slot_assignments table is available');
    }
  } catch (error) {
    console.log('❌ Error testing slot_assignments:', error.message);
    allReady = false;
  }

  // Test 3: Check if confirm_slot_assignment function exists
  console.log('\n3️⃣ Testing confirm_slot_assignment function...');
  try {
    const { data, error } = await supabase
      .rpc('confirm_slot_assignment', { 
        assignment_id: '00000000-0000-0000-0000-000000000000',
        action: 'confirm'
      });

    if (error) {
      if (error.message.includes('Assignment not found')) {
        console.log('✅ confirm_slot_assignment function is available');
      } else if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ confirm_slot_assignment function not available:', error.message);
        allReady = false;
      } else {
        console.log('✅ confirm_slot_assignment function is available (expected error for test UUID)');
      }
    } else {
      console.log('✅ confirm_slot_assignment function is available');
    }
  } catch (error) {
    console.log('❌ Error testing confirm_slot_assignment function:', error.message);
    allReady = false;
  }

  // Test 4: Check if expire_slot_assignments function exists
  console.log('\n4️⃣ Testing expire_slot_assignments function...');
  try {
    const { data, error } = await supabase
      .rpc('expire_slot_assignments');

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ expire_slot_assignments function not available:', error.message);
        allReady = false;
      } else {
        console.log('✅ expire_slot_assignments function is available');
      }
    } else {
      console.log('✅ expire_slot_assignments function is available');
    }
  } catch (error) {
    console.log('❌ Error testing expire_slot_assignments function:', error.message);
    allReady = false;
  }

  // Test 5: Check existing booking system tables
  console.log('\n5️⃣ Testing existing booking system tables...');
  try {
    const { data: scheduleSlots, error: scheduleError } = await supabase
      .from('schedule_slots')
      .select('id, teacher_id, date, start_time, end_time, status')
      .limit(1);

    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('id, teacher_id, day_of_week, start_time, end_time')
      .limit(1);

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, teacher_id, student_id, status')
      .limit(1);

    if (scheduleError || timeSlotsError || bookingsError) {
      console.log('❌ Some existing booking system tables are missing');
      if (scheduleError) console.log('   - schedule_slots:', scheduleError.message);
      if (timeSlotsError) console.log('   - time_slots:', timeSlotsError.message);
      if (bookingsError) console.log('   - bookings:', bookingsError.message);
      allReady = false;
    } else {
      console.log('✅ Existing booking system tables are available');
    }
  } catch (error) {
    console.log('❌ Error testing existing tables:', error.message);
    allReady = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allReady) {
    console.log('🎉 DATABASE IS READY FOR INTERACTIVE CALENDAR BOOKING!');
    console.log('✅ All required schema changes are in place');
    console.log('✅ All functions are available');
    console.log('✅ Existing booking system is intact');
    console.log('\n📋 You can now proceed with:');
    console.log('   - Testing the new API endpoints');
    console.log('   - Implementing drag-and-drop UI components');
    console.log('   - Building student assignment workflows');
  } else {
    console.log('❌ DATABASE IS NOT READY');
    console.log('⚠️ Some schema changes are missing');
    console.log('\n🔧 To fix this, you need to:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the migration SQL from:');
    console.log('      supabase/migrations/20250123000001_create_interactive_calendar_schema.sql');
    console.log('   4. Execute the statements one by one');
    console.log('   5. Run this test script again to verify');
  }
  console.log('=' .repeat(60));
}

testSchema().catch(console.error);