#!/usr/bin/env node

/**
 * Unit tests for pending payments calculation logic
 * Tests the core calculation without requiring API authentication
 * Requirements: 2.1, 2.2, 2.3
 */

// Mock calculation function based on the API implementation
function calculatePendingPayments(classLogs, credits, ratePerHour = 100) {
  const studentHours = new Map()
  
  // Group class logs by student and calculate completed hours
  classLogs.forEach(log => {
    const studentId = log.student_id
    const hours = (log.duration_minutes || 0) / 60
    
    if (studentHours.has(studentId)) {
      const existing = studentHours.get(studentId)
      existing.completed_hours += hours
      if (log.date > existing.last_class_date) {
        existing.last_class_date = log.date
      }
    } else {
      studentHours.set(studentId, {
        student_id: studentId,
        student_name: log.student_name || 'Unknown Student',
        completed_hours: hours,
        last_class_date: log.date
      })
    }
  })
  
  // Calculate pending payments
  const pendingStudents = []
  let totalPendingAmount = 0
  
  studentHours.forEach((studentData, studentId) => {
    const creditData = credits.find(c => c.student_id === studentId) || { total_purchased: 0 }
    const awardedCredits = creditData.total_purchased || 0
    const pendingHours = Math.max(0, studentData.completed_hours - awardedCredits)
    
    if (pendingHours > 0) {
      const pendingAmount = pendingHours * ratePerHour
      
      pendingStudents.push({
        student_id: studentId,
        student_name: studentData.student_name,
        completed_hours: Math.round(studentData.completed_hours * 100) / 100,
        awarded_credits: awardedCredits,
        pending_hours: Math.round(pendingHours * 100) / 100,
        pending_amount: Math.round(pendingAmount * 100) / 100,
        last_class_date: studentData.last_class_date,
        rate_per_hour: ratePerHour
      })
      
      totalPendingAmount += pendingAmount
    }
  })
  
  return {
    total_pending_amount: Math.round(totalPendingAmount * 100) / 100,
    students: pendingStudents.sort((a, b) => b.pending_amount - a.pending_amount)
  }
}

function runCalculationTests() {
  console.log('🧪 Pending Payments Calculation Logic Tests\n')
  
  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  }
  
  // Test Case 1: Normal pending payment scenario
  console.log('1️⃣ Testing normal pending payment calculation...')
  try {
    const classLogs = [
      { student_id: 'student1', student_name: 'John Doe', duration_minutes: 120, date: '2024-01-15' },
      { student_id: 'student1', student_name: 'John Doe', duration_minutes: 90, date: '2024-01-20' }
    ]
    const credits = [
      { student_id: 'student1', total_purchased: 2.5 }
    ]
    
    const result = calculatePendingPayments(classLogs, credits, 100)
    
    // Expected: 3.5 hours completed, 2.5 credits, 1 hour pending = ₹100
    if (result.students.length === 1 && 
        result.students[0].completed_hours === 3.5 &&
        result.students[0].awarded_credits === 2.5 &&
        result.students[0].pending_hours === 1 &&
        result.students[0].pending_amount === 100 &&
        result.total_pending_amount === 100) {
      testResults.passed++
      console.log('   ✅ Normal calculation test passed')
    } else {
      testResults.failed++
      testResults.errors.push('Normal calculation test failed')
      console.log('   ❌ Normal calculation test failed')
      console.log('   Expected: 3.5h completed, 2.5h credits, 1h pending, ₹100')
      console.log(`   Got: ${result.students[0]?.completed_hours}h completed, ${result.students[0]?.awarded_credits}h credits, ${result.students[0]?.pending_hours}h pending, ₹${result.students[0]?.pending_amount}`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`Normal calculation test error: ${error.message}`)
    console.log('   ❌ Normal calculation test error:', error.message)
  }
  
  // Test Case 2: Zero balance scenario
  console.log('\n2️⃣ Testing zero balance scenario...')
  try {
    const classLogs = [
      { student_id: 'student2', student_name: 'Jane Smith', duration_minutes: 120, date: '2024-01-15' }
    ]
    const credits = [
      { student_id: 'student2', total_purchased: 2 }
    ]
    
    const result = calculatePendingPayments(classLogs, credits, 100)
    
    // Expected: 2 hours completed, 2 credits, 0 pending
    if (result.students.length === 0 && result.total_pending_amount === 0) {
      testResults.passed++
      console.log('   ✅ Zero balance test passed')
    } else {
      testResults.failed++
      testResults.errors.push('Zero balance test failed')
      console.log('   ❌ Zero balance test failed')
      console.log('   Expected: 0 students with pending payments')
      console.log(`   Got: ${result.students.length} students, ₹${result.total_pending_amount} total`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`Zero balance test error: ${error.message}`)
    console.log('   ❌ Zero balance test error:', error.message)
  }
  
  // Test Case 3: Negative balance (more credits than hours)
  console.log('\n3️⃣ Testing negative balance scenario...')
  try {
    const classLogs = [
      { student_id: 'student3', student_name: 'Bob Wilson', duration_minutes: 60, date: '2024-01-15' }
    ]
    const credits = [
      { student_id: 'student3', total_purchased: 2 }
    ]
    
    const result = calculatePendingPayments(classLogs, credits, 100)
    
    // Expected: 1 hour completed, 2 credits, 0 pending (no negative amounts)
    if (result.students.length === 0 && result.total_pending_amount === 0) {
      testResults.passed++
      console.log('   ✅ Negative balance test passed (no negative amounts)')
    } else {
      testResults.failed++
      testResults.errors.push('Negative balance test failed')
      console.log('   ❌ Negative balance test failed')
      console.log('   Expected: 0 students with pending payments (no negative amounts)')
      console.log(`   Got: ${result.students.length} students, ₹${result.total_pending_amount} total`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`Negative balance test error: ${error.message}`)
    console.log('   ❌ Negative balance test error:', error.message)
  }
  
  // Test Case 4: No credits awarded
  console.log('\n4️⃣ Testing no credits scenario...')
  try {
    const classLogs = [
      { student_id: 'student4', student_name: 'Alice Brown', duration_minutes: 90, date: '2024-01-15' }
    ]
    const credits = [] // No credits for this student
    
    const result = calculatePendingPayments(classLogs, credits, 150)
    
    // Expected: 1.5 hours completed, 0 credits, 1.5 hours pending = ₹225
    if (result.students.length === 1 && 
        result.students[0].completed_hours === 1.5 &&
        result.students[0].awarded_credits === 0 &&
        result.students[0].pending_hours === 1.5 &&
        result.students[0].pending_amount === 225 &&
        result.total_pending_amount === 225) {
      testResults.passed++
      console.log('   ✅ No credits test passed')
    } else {
      testResults.failed++
      testResults.errors.push('No credits test failed')
      console.log('   ❌ No credits test failed')
      console.log('   Expected: 1.5h completed, 0h credits, 1.5h pending, ₹225')
      console.log(`   Got: ${result.students[0]?.completed_hours}h completed, ${result.students[0]?.awarded_credits}h credits, ${result.students[0]?.pending_hours}h pending, ₹${result.students[0]?.pending_amount}`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`No credits test error: ${error.message}`)
    console.log('   ❌ No credits test error:', error.message)
  }
  
  // Test Case 5: Multiple students
  console.log('\n5️⃣ Testing multiple students scenario...')
  try {
    const classLogs = [
      { student_id: 'student5', student_name: 'Charlie Davis', duration_minutes: 120, date: '2024-01-15' },
      { student_id: 'student6', student_name: 'Diana Evans', duration_minutes: 90, date: '2024-01-16' },
      { student_id: 'student5', student_name: 'Charlie Davis', duration_minutes: 60, date: '2024-01-20' }
    ]
    const credits = [
      { student_id: 'student5', total_purchased: 1 },
      { student_id: 'student6', total_purchased: 1.5 }
    ]
    
    const result = calculatePendingPayments(classLogs, credits, 100)
    
    // Expected: Charlie: 3h-1h=2h pending=₹200, Diana: 1.5h-1.5h=0h pending
    // Total: ₹200, 1 student
    if (result.students.length === 1 && 
        result.students[0].student_name === 'Charlie Davis' &&
        result.students[0].pending_hours === 2 &&
        result.students[0].pending_amount === 200 &&
        result.total_pending_amount === 200) {
      testResults.passed++
      console.log('   ✅ Multiple students test passed')
    } else {
      testResults.failed++
      testResults.errors.push('Multiple students test failed')
      console.log('   ❌ Multiple students test failed')
      console.log('   Expected: 1 student (Charlie) with 2h pending, ₹200 total')
      console.log(`   Got: ${result.students.length} students, ₹${result.total_pending_amount} total`)
      if (result.students.length > 0) {
        console.log(`   First student: ${result.students[0].student_name}, ${result.students[0].pending_hours}h, ₹${result.students[0].pending_amount}`)
      }
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`Multiple students test error: ${error.message}`)
    console.log('   ❌ Multiple students test error:', error.message)
  }
  
  // Test Case 6: Rounding precision
  console.log('\n6️⃣ Testing rounding precision...')
  try {
    const classLogs = [
      { student_id: 'student7', student_name: 'Frank Green', duration_minutes: 37, date: '2024-01-15' } // 0.6167 hours
    ]
    const credits = [
      { student_id: 'student7', total_purchased: 0.1 }
    ]
    
    const result = calculatePendingPayments(classLogs, credits, 150)
    
    // Check that values are properly rounded to 2 decimal places
    const student = result.students[0]
    const hasProperRounding = 
      student.completed_hours.toString().split('.')[1]?.length <= 2 &&
      student.pending_hours.toString().split('.')[1]?.length <= 2 &&
      student.pending_amount.toString().split('.')[1]?.length <= 2
    
    if (hasProperRounding) {
      testResults.passed++
      console.log('   ✅ Rounding precision test passed')
      console.log(`   Values: ${student.completed_hours}h completed, ${student.pending_hours}h pending, ₹${student.pending_amount}`)
    } else {
      testResults.failed++
      testResults.errors.push('Rounding precision test failed')
      console.log('   ❌ Rounding precision test failed')
      console.log(`   Values: ${student.completed_hours}h completed, ${student.pending_hours}h pending, ₹${student.pending_amount}`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push(`Rounding precision test error: ${error.message}`)
    console.log('   ❌ Rounding precision test error:', error.message)
  }
  
  // Print test summary
  console.log('\n📊 Test Summary:')
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`)
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:')
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  }
  
  console.log('\n🎉 Calculation Logic Tests Completed!')
  
  return testResults.failed === 0
}

// Run the tests
const success = runCalculationTests()
process.exit(success ? 0 : 1)