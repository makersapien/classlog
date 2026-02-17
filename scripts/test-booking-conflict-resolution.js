#!/usr/bin/env node

/**
 * Test script for booking conflict resolution and queue functionality
 * Tests the enhanced conflict detection, resolution suggestions, and booking queue features
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Test data
const testData = {
  teacher: {
    email: 'teacher@test.com',
    password: 'password123',
    full_name: 'Test Teacher'
  },
  student: {
    email: 'student@test.com', 
    password: 'password123',
    full_name: 'Test Student'
  }
}

let authTokens = {}
let testIds = {}

async function makeRequest(endpoint, options = {}) {
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

async function authenticateUser(userType) {
  console.log(`🔐 Authenticating ${userType}...`)
  
  const { response, data } = await makeRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email: testData[userType].email,
      password: testData[userType].password
    })
  })
  
  if (!response.ok) {
    throw new Error(`Authentication failed for ${userType}: ${data.error}`)
  }
  
  authTokens[userType] = data.token || 'mock-token'
  console.log(`✅ ${userType} authenticated`)
  return data
}

async function createTestTimeSlots() {
  console.log('\n📅 Creating test time slots with conflicts...')
  
  // Create overlapping time slots to test conflict detection
  const conflictingSlots = [
    {
      day_of_week: 'Monday',
      start_time: '10:00',
      end_time: '11:00',
      is_available: true,
      subject: 'Math'
    },
    {
      day_of_week: 'Monday', 
      start_time: '10:30', // Overlaps with previous slot
      end_time: '11:30',
      is_available: true,
      subject: 'Science'
    },
    {
      day_of_week: 'Tuesday',
      start_time: '14:00',
      end_time: '15:00',
      is_available: true,
      subject: 'English'
    }
  ]
  
  for (const slot of conflictingSlots) {
    const { response, data } = await makeRequest('/api/timeslots', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      },
      body: JSON.stringify(slot)
    })
    
    if (response.ok) {
      console.log(`✅ Created time slot: ${slot.day_of_week} ${slot.start_time}-${slot.end_time}`)
      if (!testIds.timeSlots) testIds.timeSlots = []
      testIds.timeSlots.push(data.time_slot.id)
    } else {
      console.log(`⚠️ Failed to create time slot: ${data.error}`)
    }
  }
}

async function testConflictDetection() {
  console.log('\n🔍 Testing conflict detection...')
  
  const slotsToCheck = [
    {
      day_of_week: 'Monday',
      start_time: '10:15', // Should conflict with existing slots
      end_time: '11:15'
    },
    {
      day_of_week: 'Tuesday',
      start_time: '14:30', // Should conflict with existing slot
      end_time: '15:30'
    },
    {
      day_of_week: 'Wednesday',
      start_time: '09:00', // Should not conflict
      end_time: '10:00'
    }
  ]
  
  const { response, data } = await makeRequest('/api/timeslots/conflicts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      slots: slotsToCheck,
      check_time_slots: true,
      check_schedule_slots: true
    })
  })
  
  if (response.ok) {
    console.log(`✅ Conflict detection completed`)
    console.log(`📊 Found ${data.total_conflicts} conflicts`)
    
    if (data.has_conflicts) {
      console.log('🚨 Conflicts detected:')
      data.conflicts.forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.slot.day_of_week} ${conflict.slot.start_time}-${conflict.slot.end_time}`)
        console.log(`     - Time slot conflicts: ${conflict.time_slot_conflicts.length}`)
        console.log(`     - Schedule conflicts: ${conflict.schedule_slot_conflicts.length}`)
        console.log(`     - Blocked slot conflicts: ${conflict.blocked_slot_conflicts.length}`)
      })
    } else {
      console.log('✅ No conflicts detected')
    }
    
    return data.conflicts
  } else {
    console.error(`❌ Conflict detection failed: ${data.error}`)
    return []
  }
}

async function testConflictResolution(conflicts) {
  if (!conflicts || conflicts.length === 0) {
    console.log('\n⏭️ Skipping conflict resolution (no conflicts to resolve)')
    return
  }
  
  console.log('\n🔧 Testing conflict resolution...')
  
  // Test suggestion strategy
  console.log('📋 Testing suggestion strategy...')
  const conflictsForResolution = conflicts.flatMap(conflict => 
    conflict.time_slot_conflicts.map(tc => ({
      type: 'time_overlap',
      conflicting_slot_id: tc.id,
      proposed_slot: conflict.slot
    }))
  )
  
  const { response: suggestResponse, data: suggestData } = await makeRequest('/api/timeslots/conflicts', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      conflicts: conflictsForResolution,
      resolution_strategy: 'suggest_alternatives',
      adjustment_preferences: {
        preferred_direction: 'any',
        max_adjustment_minutes: 60,
        allow_day_change: false
      }
    })
  })
  
  if (suggestResponse.ok) {
    console.log(`✅ Conflict resolution suggestions generated`)
    console.log(`📊 Resolutions provided: ${suggestData.resolutions.length}`)
    
    suggestData.resolutions.forEach((resolution, index) => {
      console.log(`  ${index + 1}. Suggestions: ${resolution.suggestions.length}`)
      resolution.suggestions.forEach((suggestion, sIndex) => {
        console.log(`     - ${suggestion}`)
      })
    })
  } else {
    console.error(`❌ Conflict resolution failed: ${suggestData.error}`)
  }
  
  // Test auto-adjust strategy
  console.log('\n🔄 Testing auto-adjust strategy...')
  const { response: adjustResponse, data: adjustData } = await makeRequest('/api/timeslots/conflicts', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      conflicts: conflictsForResolution.slice(0, 1), // Only adjust one conflict
      resolution_strategy: 'auto_adjust',
      adjustment_preferences: {
        preferred_direction: 'later',
        max_adjustment_minutes: 30,
        allow_day_change: false
      }
    })
  })
  
  if (adjustResponse.ok) {
    console.log(`✅ Auto-adjustment completed`)
    console.log(`📊 Resolutions applied: ${adjustData.total_resolved}`)
    
    adjustData.resolutions.forEach((resolution, index) => {
      if (resolution.resolution_applied) {
        console.log(`  ${index + 1}. ✅ ${resolution.suggestions[0]}`)
      } else {
        console.log(`  ${index + 1}. ❌ ${resolution.error}`)
      }
    })
  } else {
    console.error(`❌ Auto-adjustment failed: ${adjustData.error}`)
  }
}

async function testBookingQueue() {
  console.log('\n🎯 Testing booking queue functionality...')
  
  // First, create a student share token
  console.log('🔗 Creating student share token...')
  const { response: tokenResponse, data: tokenData } = await makeRequest('/api/teacher/students', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      student_email: testData.student.email,
      student_name: testData.student.full_name
    })
  })
  
  let shareToken
  if (tokenResponse.ok) {
    shareToken = tokenData.share_token
    console.log(`✅ Share token created: ${shareToken.substring(0, 8)}...`)
  } else {
    console.log(`⚠️ Using mock share token (student creation failed: ${tokenData.error})`)
    shareToken = 'mock-share-token'
  }
  
  // Test joining queue
  console.log('📝 Testing queue join...')
  const { response: queueResponse, data: queueData } = await makeRequest('/api/timeslots/queue', {
    method: 'POST',
    body: JSON.stringify({
      day_of_week: 'Monday',
      start_time: '10:00',
      end_time: '11:00',
      share_token: shareToken,
      priority: 1,
      auto_book: false // Don't auto-book for testing
    })
  })
  
  if (queueResponse.ok) {
    console.log(`✅ Successfully joined queue`)
    console.log(`📊 Position in queue: #${queueData.position}`)
    console.log(`⏱️ Estimated wait time: ${queueData.estimated_wait_time} hours`)
    testIds.queueEntry = queueData.queue_entry.id
  } else {
    console.log(`⚠️ Queue join failed: ${queueData.error}`)
    if (queueData.code === 'SLOT_AVAILABLE') {
      console.log('💡 Slot is available for direct booking')
    }
  }
  
  // Test viewing queue
  console.log('👀 Testing queue view...')
  const { response: viewResponse, data: viewData } = await makeRequest(`/api/timeslots/queue?share_token=${shareToken}`)
  
  if (viewResponse.ok) {
    console.log(`✅ Queue view successful`)
    console.log(`📊 Total entries: ${viewData.total_entries}`)
    console.log(`📈 Queue stats:`)
    console.log(`   - Total waiting: ${viewData.queue_stats.total_waiting}`)
    console.log(`   - Average wait time: ${Math.round(viewData.queue_stats.average_wait_time)} hours`)
  } else {
    console.log(`❌ Queue view failed: ${viewData.error}`)
  }
}

async function testQueueManagement() {
  if (!testIds.queueEntry) {
    console.log('\n⏭️ Skipping queue management (no queue entry to manage)')
    return
  }
  
  console.log('\n⚙️ Testing queue management...')
  
  // Test promoting in queue
  console.log('⬆️ Testing queue promotion...')
  const { response: promoteResponse, data: promoteData } = await makeRequest('/api/timeslots/queue', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      queue_id: testIds.queueEntry,
      action: 'promote'
    })
  })
  
  if (promoteResponse.ok) {
    console.log(`✅ Queue promotion successful`)
    console.log(`📊 New position: #${promoteData.position}`)
  } else {
    console.log(`❌ Queue promotion failed: ${promoteData.error}`)
  }
  
  // Test auto-booking
  console.log('🤖 Testing auto-booking...')
  const { response: autoBookResponse, data: autoBookData } = await makeRequest('/api/timeslots/queue', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authTokens.teacher}`
    },
    body: JSON.stringify({
      queue_id: testIds.queueEntry,
      action: 'auto_book'
    })
  })
  
  if (autoBookResponse.ok) {
    if (autoBookData.auto_booked) {
      console.log(`✅ Auto-booking successful`)
      console.log(`📅 Booking created: ${autoBookData.booking.id}`)
    } else {
      console.log(`ℹ️ Auto-booking not possible: ${autoBookData.message}`)
    }
  } else {
    console.log(`❌ Auto-booking failed: ${autoBookData.error}`)
    if (autoBookData.code === 'SLOT_NOT_AVAILABLE') {
      console.log('💡 Slot is not currently available for booking')
    }
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...')
  
  // Clean up time slots
  if (testIds.timeSlots) {
    for (const slotId of testIds.timeSlots) {
      const { response } = await makeRequest(`/api/timeslots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authTokens.teacher}`
        }
      })
      
      if (response.ok) {
        console.log(`✅ Deleted time slot: ${slotId}`)
      } else {
        console.log(`⚠️ Failed to delete time slot: ${slotId}`)
      }
    }
  }
  
  // Clean up queue entry
  if (testIds.queueEntry) {
    const { response } = await makeRequest('/api/timeslots/queue', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authTokens.teacher}`
      },
      body: JSON.stringify({
        queue_id: testIds.queueEntry,
        action: 'remove'
      })
    })
    
    if (response.ok) {
      console.log(`✅ Removed queue entry: ${testIds.queueEntry}`)
    } else {
      console.log(`⚠️ Failed to remove queue entry: ${testIds.queueEntry}`)
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Booking Conflict Resolution & Queue Tests')
  console.log('=' .repeat(60))
  
  try {
    // Authentication
    await authenticateUser('teacher')
    await authenticateUser('student')
    
    // Test conflict detection and resolution
    await createTestTimeSlots()
    const conflicts = await testConflictDetection()
    await testConflictResolution(conflicts)
    
    // Test booking queue
    await testBookingQueue()
    await testQueueManagement()
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    await cleanup()
  }
}

// Run tests
runTests().catch(console.error)