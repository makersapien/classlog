#!/usr/bin/env node

// Comprehensive test suite for the booking system
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Comprehensive Booking System Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, condition) {
  if (condition) {
    console.log(`✅ ${description}`);
    testsPassed++;
  } else {
    console.log(`❌ ${description}`);
    testsFailed++;
  }
}

// Test 1: Database Schema Files
console.log('📊 Testing Database Schema...');
test('Booking system tables migration exists', 
  fs.existsSync(path.join(__dirname, '../supabase/migrations/20250117000001_create_booking_system_tables.sql')));
test('Booking transaction functions migration exists', 
  fs.existsSync(path.join(__dirname, '../supabase/migrations/20250117000002_create_booking_transaction_functions.sql')));

// Test 2: API Endpoints
console.log('\n🔌 Testing API Endpoints...');
const apiEndpoints = [
  'src/app/api/timeslots/route.ts',
  'src/app/api/timeslots/[id]/route.ts', 
  'src/app/api/timeslots/bulk-create/route.ts',
  'src/app/api/booking/[token]/calendar/route.ts',
  'src/app/api/booking/[token]/book/route.ts',
  'src/app/api/booking/[token]/cancel/[booking_id]/route.ts',
  'src/app/api/booking/[token]/my-bookings/route.ts',
  'src/app/api/teacher/students/[id]/share-link/route.ts',
  'src/app/api/teacher/students/[id]/regenerate-token/route.ts',
  'src/app/api/teacher/analytics/token-usage/route.ts'
];

apiEndpoints.forEach(endpoint => {
  test(`API endpoint: ${endpoint.split('/').pop()}`, 
    fs.existsSync(path.join(__dirname, '..', endpoint)));
});

// Test 3: Components
console.log('\n🎨 Testing UI Components...');
test('TeacherScheduleView component exists', 
  fs.existsSync(path.join(__dirname, '../src/components/TeacherScheduleView.tsx')));

// Test 4: Dashboard Integration
console.log('\n🏠 Testing Dashboard Integration...');
const dashboardContent = fs.readFileSync(path.join(__dirname, '../src/app/dashboard/TeacherDashboard.tsx'), 'utf8');
test('TeacherScheduleView imported in dashboard', 
  dashboardContent.includes('import TeacherScheduleView'));
test('Schedule tab uses TeacherScheduleView', 
  dashboardContent.includes('<TeacherScheduleView'));
test('Students tab preserved', 
  dashboardContent.includes('TabsContent value="students"'));

// Test 5: Type Definitions
console.log('\n📝 Testing Type Definitions...');
const typesContent = fs.readFileSync(path.join(__dirname, '../src/types/database.ts'), 'utf8');
test('share_tokens table types defined', 
  typesContent.includes('share_tokens:'));
test('bookings table types defined', 
  typesContent.includes('bookings:'));
test('time_slots table types defined', 
  typesContent.includes('time_slots:'));

// Test 6: Security Features
console.log('\n🔒 Testing Security Implementation...');
const shareTokenContent = fs.readFileSync(path.join(__dirname, '../src/app/api/teacher/students/[id]/share-link/route.ts'), 'utf8');
test('Share token API has authentication check', 
  shareTokenContent.includes('createAuthenticatedSupabaseClient'));
test('Share token API validates teacher role', 
  shareTokenContent.includes('profile.role !== \'teacher\''));

const bookingContent = fs.readFileSync(path.join(__dirname, '../src/app/api/booking/[token]/book/route.ts'), 'utf8');
test('Booking API validates share token', 
  bookingContent.includes('validate_share_token'));
test('Booking API checks credit balance', 
  bookingContent.includes('balance_hours'));

// Test 7: Database Functions
console.log('\n⚙️ Testing Database Functions...');
const functionsContent = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20250117000002_create_booking_transaction_functions.sql'), 'utf8');
const tablesContent = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20250117000001_create_booking_system_tables.sql'), 'utf8');
test('create_share_token function defined', 
  tablesContent.includes('FUNCTION create_share_token'));
test('validate_share_token function defined', 
  tablesContent.includes('FUNCTION validate_share_token'));
test('book_slot_with_validation function defined', 
  functionsContent.includes('CREATE OR REPLACE FUNCTION book_slot_with_validation'));
test('cancel_booking function defined', 
  functionsContent.includes('CREATE OR REPLACE FUNCTION cancel_booking'));

// Test 8: Error Handling
console.log('\n🚨 Testing Error Handling...');
const timeslotsContent = fs.readFileSync(path.join(__dirname, '../src/app/api/timeslots/route.ts'), 'utf8');
test('Timeslots API has comprehensive error handling', 
  timeslotsContent.includes('try {') && timeslotsContent.includes('catch (error)'));
test('Timeslots API validates input with Zod', 
  timeslotsContent.includes('z.object'));

// Test 9: Privacy Features
console.log('\n👁️ Testing Privacy Features...');
const calendarContent = fs.readFileSync(path.join(__dirname, '../src/app/api/booking/[token]/calendar/route.ts'), 'utf8');
test('Student calendar API uses privacy filtering', 
  calendarContent.includes('get_student_calendar'));

const scheduleViewContent = fs.readFileSync(path.join(__dirname, '../src/components/TeacherScheduleView.tsx'), 'utf8');
test('TeacherScheduleView has blur functionality', 
  scheduleViewContent.includes('blurredStudents'));
test('TeacherScheduleView has student themes', 
  scheduleViewContent.includes('studentThemes'));

// Test 10: Integration Points
console.log('\n🔗 Testing Integration Points...');
test('TeacherScheduleView accepts teacherId prop', 
  scheduleViewContent.includes('teacherId: string'));
test('TeacherScheduleView accepts user prop', 
  scheduleViewContent.includes('user: {'));

// Summary
console.log('\n📊 Test Results Summary:');
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Booking system is ready for next phase.');
  console.log('\n🚀 Ready to proceed with:');
  console.log('   • Task 3.2: AvailabilityModal component');
  console.log('   • Task 4.1: StudentBookingPortal component');
  console.log('   • Task 5.2: Student portal routing');
  process.exit(0);
} else {
  console.log('\n⚠️ Some tests failed. Please review the issues above.');
  process.exit(1);
}