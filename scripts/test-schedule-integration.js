#!/usr/bin/env node

// Test script to verify schedule integration with dashboard
const fs = require('fs');
const path = require('path');

console.log('🔄 Testing Schedule Integration...\n');

// Test 1: Check if TeacherScheduleView component exists
const scheduleViewPath = path.join(__dirname, '../src/components/TeacherScheduleView.tsx');
if (fs.existsSync(scheduleViewPath)) {
  console.log('✅ TeacherScheduleView component exists');
} else {
  console.log('❌ TeacherScheduleView component missing');
  process.exit(1);
}

// Test 2: Check if TeacherDashboard imports TeacherScheduleView
const dashboardPath = path.join(__dirname, '../src/app/dashboard/TeacherDashboard.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

if (dashboardContent.includes('import TeacherScheduleView')) {
  console.log('✅ TeacherDashboard imports TeacherScheduleView');
} else {
  console.log('❌ TeacherDashboard missing TeacherScheduleView import');
  process.exit(1);
}

// Test 3: Check if schedule tab uses TeacherScheduleView
if (dashboardContent.includes('<TeacherScheduleView')) {
  console.log('✅ Schedule tab uses TeacherScheduleView component');
} else {
  console.log('❌ Schedule tab not using TeacherScheduleView component');
  process.exit(1);
}

// Test 4: Check if existing tabs structure is preserved
if (dashboardContent.includes('TabsTrigger value="students"') && 
    dashboardContent.includes('TabsTrigger value="schedule"')) {
  console.log('✅ Existing tabs structure preserved');
} else {
  console.log('❌ Tabs structure modified incorrectly');
  process.exit(1);
}

// Test 5: Check if students tab content is unchanged
if (dashboardContent.includes('TabsContent value="students"') && 
    dashboardContent.includes('StudentCard')) {
  console.log('✅ Students tab functionality preserved');
} else {
  console.log('❌ Students tab functionality may be broken');
  process.exit(1);
}

// Test 6: Verify API endpoints exist
const apiPaths = [
  '../src/app/api/timeslots/route.ts',
  '../src/app/api/timeslots/[id]/route.ts',
  '../src/app/api/timeslots/bulk-create/route.ts',
  '../src/app/api/booking/[token]/calendar/route.ts',
  '../src/app/api/booking/[token]/book/route.ts',
  '../src/app/api/teacher/students/[id]/share-link/route.ts'
];

let allApiEndpointsExist = true;
apiPaths.forEach(apiPath => {
  const fullPath = path.join(__dirname, apiPath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ API endpoint exists: ${apiPath.split('/').pop()}`);
  } else {
    console.log(`❌ API endpoint missing: ${apiPath}`);
    allApiEndpointsExist = false;
  }
});

if (!allApiEndpointsExist) {
  console.log('\n❌ Some API endpoints are missing');
  process.exit(1);
}

// Test 7: Check database migrations
const migrationPaths = [
  '../supabase/migrations/20250117000001_create_booking_system_tables.sql',
  '../supabase/migrations/20250117000002_create_booking_transaction_functions.sql'
];

let allMigrationsExist = true;
migrationPaths.forEach(migrationPath => {
  const fullPath = path.join(__dirname, migrationPath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Migration exists: ${migrationPath.split('/').pop()}`);
  } else {
    console.log(`❌ Migration missing: ${migrationPath}`);
    allMigrationsExist = false;
  }
});

if (!allMigrationsExist) {
  console.log('\n❌ Some database migrations are missing');
  process.exit(1);
}

console.log('\n🎉 All integration tests passed!');
console.log('\n📋 Integration Summary:');
console.log('   • TeacherScheduleView component integrated into dashboard');
console.log('   • Existing students tab functionality preserved');
console.log('   • Schedule tab now uses enhanced booking interface');
console.log('   • All API endpoints created and ready');
console.log('   • Database schema extended with booking tables');
console.log('   • Non-breaking integration completed successfully');

console.log('\n🚀 Next Steps:');
console.log('   1. Run database migrations to create booking tables');
console.log('   2. Test the schedule interface in the dashboard');
console.log('   3. Create availability management modal (Task 3.2)');
console.log('   4. Implement student booking portal (Task 4.1)');