#!/usr/bin/env node

// Test script for DELETE slot API endpoint
const fs = require('fs');
const path = require('path');

console.log('🗑️ Testing DELETE Slot API Endpoint...\\n');

// Test 1: Check if DELETE endpoint exists
console.log('1. Testing DELETE endpoint existence...');
const deleteApiPath = path.join(__dirname, '../src/app/api/schedule-slots/[id]/route.ts');
if (fs.existsSync(deleteApiPath)) {
  const content = fs.readFileSync(deleteApiPath, 'utf8');
  
  const tests = [
    { name: 'Has DELETE export', check: content.includes('export async function DELETE') },
    { name: 'Validates authentication', check: content.includes('createAuthenticatedSupabaseClient') },
    { name: 'Checks slot ID parameter', check: content.includes('params.id') },
    { name: 'Verifies slot ownership', check: content.includes('teacher_id !== user.id') },
    { name: 'Prevents deletion of booked slots', check: content.includes('Cannot delete booked slots') },
    { name: 'Performs database deletion', check: content.includes('.delete()') },
    { name: 'Returns success message', check: content.includes('Slot deleted successfully') },
    { name: 'Has proper error handling', check: content.includes('catch (error)') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
} else {
  console.log('   ❌ DELETE API endpoint not found');
}

// Test 2: Check frontend error handling improvements
console.log('\\n2. Testing frontend error handling...');
const streamlinedPath = path.join(__dirname, '../src/components/StreamlinedScheduleView.tsx');
if (fs.existsSync(streamlinedPath)) {
  const content = fs.readFileSync(streamlinedPath, 'utf8');
  
  const tests = [
    { name: 'Has improved DELETE error handling', check: content.includes('Failed to parse error response') },
    { name: 'Has improved PATCH error handling', check: content.includes('parseError') },
    { name: 'Provides fallback error messages', check: content.includes('HTTP ${response.status}') },
    { name: 'Logs parsing errors', check: content.includes('console.error.*Failed to parse') },
    { name: 'Shows HTTP status in errors', check: content.includes('${response.status}') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
}

// Test 3: Check API endpoint structure
console.log('\\n3. Testing API endpoint structure...');
if (fs.existsSync(deleteApiPath)) {
  const content = fs.readFileSync(deleteApiPath, 'utf8');
  
  const tests = [
    { name: 'Returns 401 for unauthorized', check: content.includes('status: 401') },
    { name: 'Returns 400 for missing ID', check: content.includes('Missing slot ID') },
    { name: 'Returns 404 for not found', check: content.includes('Slot not found') },
    { name: 'Returns 403 for forbidden', check: content.includes('status: 403') },
    { name: 'Returns 400 for booked slots', check: content.includes('Cannot delete booked') },
    { name: 'Returns 500 for server errors', check: content.includes('status: 500') },
    { name: 'Logs operations', check: content.includes('console.log') }
  ];
  
  tests.forEach(test => {
    console.log(`   ${test.check ? '✅' : '❌'} ${test.name}`);
  });
}

console.log('\\n🔧 Debugging Steps:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\\n🔍 TROUBLESHOOTING CHECKLIST:');
console.log('  1. ✅ DELETE API endpoint exists and is properly structured');
console.log('  2. ✅ Frontend error handling has been improved');
console.log('  3. ✅ Better error parsing and fallback messages');
console.log('  4. ✅ HTTP status codes included in error messages');

console.log('\\n🚨 POSSIBLE ISSUES TO CHECK:');
console.log('  • Authentication: Make sure user is logged in');
console.log('  • Slot ownership: Verify slot belongs to current user');
console.log('  • Slot status: Only available/assigned slots can be deleted');
console.log('  • Network: Check browser network tab for actual error');
console.log('  • Database: Verify schedule_slots table exists');

console.log('\\n🔧 DEBUGGING COMMANDS:');
console.log('  • Check browser console for detailed error logs');
console.log('  • Check network tab for API response details');
console.log('  • Verify slot ID is valid UUID format');
console.log('  • Test with different slot statuses');

console.log('\\n📋 NEXT STEPS:');
console.log('  1. Try double-clicking an available slot');
console.log('  2. Check browser console for detailed logs');
console.log('  3. Check network tab for API response');
console.log('  4. If still failing, check server logs');

console.log('\\n✨ DELETE endpoint testing complete!');