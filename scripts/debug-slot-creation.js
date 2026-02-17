#!/usr/bin/env node

// Debug script for slot creation issue
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Slot Creation Issue...\n');

// Test 1: Check if bulk-create API exists and is properly structured
console.log('1. Testing bulk-create API structure...');
const bulkCreatePath = path.join(__dirname, '../src/app/api/schedule-slots/bulk-create/route.ts');
if (fs.existsSync(bulkCreatePath)) {
  const content = fs.readFileSync(bulkCreatePath, 'utf8');
  
  const tests = [
    { name: 'Has POST method', check: content.includes('export async function POST') },
    { name: 'Validates slots array', check: content.includes('Array.isArray(slots)') },
    { name: 'Inserts into schedule_slots', check: content.includes('schedule_slots') },
    { name: 'Returns created slots', check: content.includes('slots: createdSlots') },
    { name: 'Has proper error handling', check: content.includes('catch (error)') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
} else {
  console.log('   ❌ bulk-create API not found');
}

// Test 2: Check if regular schedule-slots API exists for fetching
console.log('\n2. Testing schedule-slots fetch API...');
const fetchApiPath = path.join(__dirname, '../src/app/api/schedule-slots/route.ts');
if (fs.existsSync(fetchApiPath)) {
  const content = fs.readFileSync(fetchApiPath, 'utf8');
  
  const tests = [
    { name: 'Has GET method', check: content.includes('export async function GET') },
    { name: 'Filters by teacher_id', check: content.includes('teacher_id') },
    { name: 'Filters by week_start', check: content.includes('week_start') },
    { name: 'Returns slots array', check: content.includes('slots') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
} else {
  console.log('   ❌ schedule-slots fetch API not found');
}

// Test 3: Check StreamlinedScheduleView data flow
console.log('\n3. Testing StreamlinedScheduleView data flow...');
const streamlinedPath = path.join(__dirname, '../src/components/StreamlinedScheduleView.tsx');
if (fs.existsSync(streamlinedPath)) {
  const content = fs.readFileSync(streamlinedPath, 'utf8');
  
  const tests = [
    { name: 'Calls bulk-create API', check: content.includes('/api/schedule-slots/bulk-create') },
    { name: 'Calls fetchScheduleData after creation', check: content.includes('fetchScheduleData() // Refresh') },
    { name: 'Uses correct fetch API', check: content.includes('/api/schedule-slots?teacher_id=') },
    { name: 'Sets scheduleSlots state', check: content.includes('setScheduleSlots(data.slots') },
    { name: 'Shows success toast', check: content.includes('Created ${slotsToCreate.length}') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
} else {
  console.log('   ❌ StreamlinedScheduleView not found');
}

// Test 4: Check data structure compatibility
console.log('\n4. Testing data structure compatibility...');
if (fs.existsSync(streamlinedPath)) {
  const content = fs.readFileSync(streamlinedPath, 'utf8');
  
  // Check if the interface matches what the API returns
  const tests = [
    { name: 'ScheduleSlot interface exists', check: content.includes('interface ScheduleSlot') },
    { name: 'Has status field', check: content.includes('status:') },
    { name: 'Has start_time field', check: content.includes('start_time') },
    { name: 'Has date field', check: content.includes('date:') },
    { name: 'Renders slots in calendar', check: content.includes('scheduleSlots.find') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
}

// Test 5: Potential issues analysis
console.log('\n5. Potential Issues Analysis...');

const potentialIssues = [
  {
    issue: 'API Response Format Mismatch',
    description: 'bulk-create API might return different format than fetch API expects',
    solution: 'Check if both APIs use same data structure'
  },
  {
    issue: 'Timing Issue',
    description: 'fetchScheduleData might be called before database transaction completes',
    solution: 'Add delay or check response from bulk-create'
  },
  {
    issue: 'Cache Issue',
    description: 'Browser or API might be caching old data',
    solution: 'Add cache-busting parameters or headers'
  },
  {
    issue: 'Database Transaction Issue',
    description: 'Slots might not be actually saved to database',
    solution: 'Check database logs and API response'
  },
  {
    issue: 'State Update Issue',
    description: 'React state might not be updating properly',
    solution: 'Check if setScheduleSlots is being called with correct data'
  }
];

potentialIssues.forEach((issue, index) => {
  console.log(`   ${index + 1}. ${issue.issue}`);
  console.log(`      Problem: ${issue.description}`);
  console.log(`      Solution: ${issue.solution}\n`);
});

console.log('🔧 Debugging Recommendations:');
console.log('1. Check browser Network tab to see if bulk-create API is succeeding');
console.log('2. Check if fetchScheduleData API call returns the newly created slots');
console.log('3. Add console.log in confirmSlotCreation to see API responses');
console.log('4. Check database to see if slots are actually being created');
console.log('5. Verify the data format matches between create and fetch APIs');

console.log('\n🎯 Quick Fix Suggestions:');
console.log('• Add error handling to see API response details');
console.log('• Add console.log to track data flow');
console.log('• Check if the week filter in fetch matches created slot dates');
console.log('• Verify teacher_id is consistent between create and fetch');

console.log('\n✨ Debug analysis complete!');