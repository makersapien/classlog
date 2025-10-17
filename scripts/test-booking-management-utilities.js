#!/usr/bin/env node

// Test script for booking management utilities
// Tests recurring slot management, conflict resolution, and waitlist functionality

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Test data
const testTeacherId = 'test-teacher-id'
const testStudentId = 'test-student-id'
const testShareToken = 'test-share-token'

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  const data = await response.json()
  return { response, data }
}

// Test 1: Recurring Slot Management
async function testRecurringSlots() {
  console.log('\n🔄 Testing Recurring Slot Management...')
  
  try {
    // Test preview functionality
    console.log('  📋 Testing recurring slot preview...')
    const previewData = {
      slots: [
        {
          day_of_week: 'Monday',
          start_time: '10:00',
          end_time: '11:00',
          subject: 'Math',
          duration_minutes: 60
        },
        {
          day_of_week: 'Wednesday',
          start_time: '14:00',
          end_time: '15:00',
          subject: 'Physics',
          duration_minutes: 60
        }
      ],
      weeks: 4,
      start_date: '2025-01-20',
      create_time_slots: true,
      create_schedule_slots: true,
      preview_only: true
    }
    
    const { response: previewResponse, data: previewResult } = await apiRequest('/api/timeslots/recurring', {
      method: 'POST',
      body: JSON.stringify(previewData)
    })
    
    if (previewResponse.ok) {
      console.log('  ✅ Preview generated successfully')
      console.log(`     - Slots to create: ${previewResult.preview.slots_to_create}`)
      console.log(`     - Total schedule slots: ${previewResult.preview.total_schedule_slots}`)
      console.log(`     - Conflicts detected: ${previewResult.preview.conflicts.length}`)
    } else {
      console.log('  ❌ Preview failed:', previewResult.error)
    }
    
    // Test conflict detection
    console.log('  🔍 Testing conflict detection...')
    const conflictData = {
      slots: [
        {
          day_of_week: 'Monday',
          start_time: '09:00',
          end_time: '10:00'
        },
        {
          day_of_week: 'Monday',
          start_time: '09:30',
          end_time: '10:30'
        }
      ],
      check_time_slots: true,
      check_schedule_slots: true
    }
    
    const { response: conflictResponse, data: conflictResult } = await apiRequest('/api/timeslots/conflicts', {
      method: 'POST',
      body: JSON.stringify(conflictData)
    })
    
    if (conflictResponse.ok) {
      console.log('  ✅ Conflict detection working')
      console.log(`     - Conflicts found: ${conflictResult.total_conflicts}`)
    } else {
      console.log('  ❌ Conflict detection failed:', conflictResult.error)
    }
    
  } catch (error) {
    console.log('  ❌ Recurring slots test failed:', error.message)
  }
}

// Test 2: Conflict Resolution
async function testConflictResolution() {
  console.log('\n⚡ Testing Conflict Resolution...')
  
  try {
    // Test suggestion generation
    console.log('  💡 Testing alternative time suggestions...')
    const resolutionData = {
      conflicts: [
        {
          type: 'time_overlap',
          conflicting_slot_id: 'test-slot-id',
          proposed_slot: {
            day_of_week: 'Tuesday',
            start_time: '10:00',
            end_time: '11:00'
          }
        }
      ],
      resolution_strategy: 'suggest_alternatives',
      adjustment_preferences: {
        preferred_direction: 'any',
        max_adjustment_minutes: 60,
        allow_day_change: false
      }
    }
    
    const { response: resolutionResponse, data: resolutionResult } = await apiRequest('/api/timeslots/conflicts', {
      method: 'PUT',
      body: JSON.stringify(resolutionData)
    })
    
    if (resolutionResponse.ok) {
      console.log('  ✅ Conflict resolution working')
      console.log(`     - Resolutions generated: ${resolutionResult.resolutions.length}`)
      resolutionResult.resolutions.forEach((resolution, index) => {
        console.log(`     - Resolution ${index + 1}: ${resolution.suggestions.length} suggestions`)
      })
    } else {
      console.log('  ❌ Conflict resolution failed:', resolutionResult.error)
    }
    
  } catch (error) {
    console.log('  ❌ Conflict resolution test failed:', error.message)
  }
}

// Test 3: Waitlist Management
async function testWaitlistManagement() {
  console.log('\n👥 Testing Waitlist Management...')
  
  try {
    // Test joining waitlist
    console.log('  📝 Testing waitlist join...')
    const waitlistData = {
      day_of_week: 'Friday',
      start_time: '15:00',
      end_time: '16:00',
      preferred_date: '2025-01-24',
      share_token: testShareToken
    }
    
    const { response: joinResponse, data: joinResult } = await apiRequest('/api/timeslots/waitlist', {
      method: 'POST',
      body: JSON.stringify(waitlistData)
    })
    
    if (joinResponse.ok) {
      console.log('  ✅ Waitlist join working')
      console.log(`     - Position in queue: ${joinResult.position}`)
      console.log(`     - Waitlist entry ID: ${joinResult.waitlist_entry.id}`)
    } else {
      console.log('  ❌ Waitlist join failed:', joinResult.error)
      if (joinResult.code === 'SLOT_AVAILABLE') {
        console.log('     - Slot is available for booking')
      }
    }
    
    // Test viewing waitlist
    console.log('  👀 Testing waitlist view...')
    const { response: viewResponse, data: viewResult } = await apiRequest(`/api/timeslots/waitlist?share_token=${testShareToken}`)
    
    if (viewResponse.ok) {
      console.log('  ✅ Waitlist view working')
      console.log(`     - Total entries: ${viewResult.total_entries}`)
      viewResult.waitlist_entries.forEach((entry, index) => {
        console.log(`     - Entry ${index + 1}: ${entry.status} (Position: ${entry.position})`)
      })
    } else {
      console.log('  ❌ Waitlist view failed:', viewResult.error)
    }
    
  } catch (error) {
    console.log('  ❌ Waitlist management test failed:', error.message)
  }
}

// Test 4: Integration Test
async function testIntegration() {
  console.log('\n🔗 Testing Integration...')
  
  try {
    // Test full booking flow with waitlist fallback
    console.log('  🎯 Testing booking with waitlist fallback...')
    
    // First try to book a slot (should fail if slot is full)
    const bookingData = {
      schedule_slot_id: 'test-schedule-slot-id',
      notes: 'Test booking'
    }
    
    const { response: bookResponse, data: bookResult } = await apiRequest(`/api/booking/${testShareToken}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    })
    
    if (bookResponse.ok) {
      console.log('  ✅ Booking successful')
    } else if (bookResult.code === 'SLOT_UNAVAILABLE' || bookResult.code === 'SLOT_FULL') {
      console.log('  📋 Slot full, testing waitlist fallback...')
      
      // Join waitlist as fallback
      const waitlistFallback = {
        schedule_slot_id: 'test-schedule-slot-id',
        day_of_week: 'Monday',
        start_time: '10:00',
        end_time: '11:00',
        share_token: testShareToken
      }
      
      const { response: waitlistResponse, data: waitlistResult } = await apiRequest('/api/timeslots/waitlist', {
        method: 'POST',
        body: JSON.stringify(waitlistFallback)
      })
      
      if (waitlistResponse.ok) {
        console.log('  ✅ Waitlist fallback working')
        console.log(`     - Added to waitlist at position ${waitlistResult.position}`)
      } else {
        console.log('  ❌ Waitlist fallback failed:', waitlistResult.error)
      }
    } else {
      console.log('  ❌ Booking failed:', bookResult.error)
    }
    
  } catch (error) {
    console.log('  ❌ Integration test failed:', error.message)
  }
}

// Test 5: Database Functions
async function testDatabaseFunctions() {
  console.log('\n🗄️ Testing Database Functions...')
  
  try {
    // Test cleanup function (would normally be called by cron)
    console.log('  🧹 Testing waitlist cleanup...')
    console.log('     - Cleanup functions are database-level and run via cron jobs')
    console.log('     - Manual testing would require direct database access')
    
    // Test notification function
    console.log('  📧 Testing waitlist notifications...')
    console.log('     - Notification functions are triggered by booking cancellations')
    console.log('     - Would be tested as part of booking cancellation flow')
    
    console.log('  ✅ Database function tests noted (require database access)')
    
  } catch (error) {
    console.log('  ❌ Database function test failed:', error.message)
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Booking Management Utilities Tests')
  console.log('=' .repeat(60))
  
  await testRecurringSlots()
  await testConflictResolution()
  await testWaitlistManagement()
  await testIntegration()
  await testDatabaseFunctions()
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Booking Management Utilities Tests Complete')
  console.log('\nNote: Some tests may fail if:')
  console.log('- Database is not properly set up')
  console.log('- Authentication is required')
  console.log('- Test data does not exist')
  console.log('- Server is not running')
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  testRecurringSlots,
  testConflictResolution,
  testWaitlistManagement,
  testIntegration,
  testDatabaseFunctions
}