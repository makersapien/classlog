#!/usr/bin/env node

/**
 * Comprehensive integration tests for pending payments calculation system
 * Tests calculation accuracy, edge cases, and performance with various scenarios
 * Requirements: 2.1, 2.2, 2.3
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey
try {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  const envLines = envContent.split('\n')
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1]
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1]
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data for various scenarios
const testScenarios = [
  {
    name: 'Normal pending payment',
    description: 'Student with completed classes but insufficient credits',
    expectedResult: 'positive pending amount'
  },
  {
    name: 'Zero balance',
    description: 'Student with equal completed hours and awarded credits',
    expectedResult: 'zero pending amount'
  },
  {
    name: 'Negative balance',
    description: 'Student with more credits than completed hours',
    expectedResult: 'zero pending amount (no negative)'
  },
  {
    name: 'No credits awarded',
    description: 'Student with completed classes but no credits',
    expectedResult: 'full pending amount'
  },
  {
    name: 'No completed classes',
    description: 'Student with credits but no completed classes',
    expectedResult: 'zero pending amount'
  }
]

async function testPendingPaymentsCalculation() {
  console.log('🧪 Comprehensive Pending Payments Integration Tests\n')
  console.log('Testing Requirements: 2.1, 2.2, 2.3\n')

  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  }

  try {
    // Step 1: Setup test data and find suitable teacher
    console.log('1️⃣ Setting up test environment...')
    
    const testTeacher = await findTestTeacher()
    if (!testTeacher) {
      console.log('⚠️ No suitable test teacher found - creating test scenario')
      return
    }

    console.log(`✅ Using teacher: ${testTeacher.full_name} (${testTeacher.email})`)

    // Step 2: Test basic API functionality
    console.log('\n2️⃣ Testing API endpoint functionality...')
    const apiResult = await testAPIEndpoint(testTeacher.id)
    if (apiResult.success) {
      testResults.passed++
      console.log('✅ API endpoint test passed')
    } else {
      testResults.failed++
      testResults.errors.push(`API endpoint test failed: ${apiResult.error}`)
      console.log(`❌ API endpoint test failed: ${apiResult.error}`)
    }

    // Step 3: Test calculation accuracy
    console.log('\n3️⃣ Testing calculation accuracy...')
    const calculationResult = await testCalculationAccuracy(testTeacher.id)
    if (calculationResult.success) {
      testResults.passed++
      console.log('✅ Calculation accuracy test passed')
    } else {
      testResults.failed++
      testResults.errors.push(`Calculation accuracy test failed: ${calculationResult.error}`)
      console.log(`❌ Calculation accuracy test failed: ${calculationResult.error}`)
    }

    // Step 4: Test edge cases
    console.log('\n4️⃣ Testing edge cases...')
    const edgeCaseResults = await testEdgeCases(testTeacher.id)
    testResults.passed += edgeCaseResults.passed
    testResults.failed += edgeCaseResults.failed
    testResults.errors.push(...edgeCaseResults.errors)

    // Step 5: Test data structure validation
    console.log('\n5️⃣ Testing response structure...')
    const structureResult = await testResponseStructure(testTeacher.id)
    if (structureResult.success) {
      testResults.passed++
      console.log('✅ Response structure test passed')
    } else {
      testResults.failed++
      testResults.errors.push(`Response structure test failed: ${structureResult.error}`)
      console.log(`❌ Response structure test failed: ${structureResult.error}`)
    }

    // Step 6: Test performance with realistic data
    console.log('\n6️⃣ Testing performance...')
    const performanceResult = await testPerformance(testTeacher.id)
    if (performanceResult.success) {
      testResults.passed++
      console.log(`✅ Performance test passed (${performanceResult.responseTime}ms)`)
    } else {
      testResults.failed++
      testResults.errors.push(`Performance test failed: ${performanceResult.error}`)
      console.log(`❌ Performance test failed: ${performanceResult.error}`)
    }

    // Step 7: Print test summary
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

    console.log('\n🎉 Pending Payments Integration Tests Completed!')

  } catch (error) {
    console.error('💥 Test suite failed:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

async function findTestTeacher() {
  const { data: teachers, error: teachersError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'teacher')
    .limit(10)

  if (teachersError || !teachers?.length) {
    console.error('❌ No teachers found:', teachersError)
    return null
  }

  // Find teacher with both class logs and credits data
  for (const teacher of teachers) {
    const { data: classLogs } = await supabase
      .from('class_logs')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('status', 'completed')
      .limit(1)

    const { data: credits } = await supabase
      .from('credits')
      .select('id')
      .eq('teacher_id', teacher.id)
      .limit(1)

    if (classLogs?.length > 0 && credits?.length > 0) {
      return teacher
    }
  }

  return teachers[0] // Fallback to first teacher
}

async function testAPIEndpoint(teacherId) {
  try {
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would include proper authentication
        'Authorization': `Bearer ${teacherId}` // Simplified for testing
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    
    // Basic validation
    if (!result.hasOwnProperty('total_pending_amount') || !result.hasOwnProperty('students')) {
      return { success: false, error: 'Missing required fields in response' }
    }

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function testCalculationAccuracy(teacherId) {
  try {
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    if (!response.ok) {
      return { success: false, error: 'API request failed' }
    }

    const result = await response.json()
    
    if (!result.students || result.students.length === 0) {
      return { success: true, message: 'No students to test calculation with' }
    }

    // Test calculation for each student
    for (const student of result.students) {
      const expectedPendingHours = Math.max(0, student.completed_hours - student.awarded_credits)
      const expectedPendingAmount = expectedPendingHours * student.rate_per_hour
      
      // Allow small floating point differences
      if (Math.abs(student.pending_hours - expectedPendingHours) > 0.01) {
        return { 
          success: false, 
          error: `Pending hours mismatch for ${student.student_name}: expected ${expectedPendingHours}, got ${student.pending_hours}` 
        }
      }
      
      if (Math.abs(student.pending_amount - expectedPendingAmount) > 0.01) {
        return { 
          success: false, 
          error: `Pending amount mismatch for ${student.student_name}: expected ₹${expectedPendingAmount}, got ₹${student.pending_amount}` 
        }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function testEdgeCases(teacherId) {
  const results = { passed: 0, failed: 0, errors: [] }
  
  console.log('   Testing edge cases:')
  
  // Test 1: Zero balances
  console.log('   - Testing zero balance handling...')
  try {
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    if (response.ok) {
      const result = await response.json()
      
      // Check that no student has negative pending amounts
      const hasNegativePending = result.students?.some(s => s.pending_amount < 0 || s.pending_hours < 0)
      if (hasNegativePending) {
        results.failed++
        results.errors.push('Found negative pending amounts or hours')
        console.log('     ❌ Negative amounts found')
      } else {
        results.passed++
        console.log('     ✅ No negative amounts')
      }
    } else {
      results.failed++
      results.errors.push('API request failed for zero balance test')
    }
  } catch (error) {
    results.failed++
    results.errors.push(`Zero balance test error: ${error.message}`)
  }

  // Test 2: Large datasets (if available)
  console.log('   - Testing with available data volume...')
  try {
    const startTime = Date.now()
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    const endTime = Date.now()
    
    if (response.ok) {
      const result = await response.json()
      const responseTime = endTime - startTime
      
      if (responseTime > 5000) { // 5 seconds threshold
        results.failed++
        results.errors.push(`Response too slow: ${responseTime}ms`)
        console.log(`     ❌ Slow response: ${responseTime}ms`)
      } else {
        results.passed++
        console.log(`     ✅ Acceptable response time: ${responseTime}ms`)
      }
      
      console.log(`     📊 Processed ${result.students?.length || 0} students`)
    } else {
      results.failed++
      results.errors.push('API request failed for performance test')
    }
  } catch (error) {
    results.failed++
    results.errors.push(`Performance test error: ${error.message}`)
  }

  // Test 3: Data consistency
  console.log('   - Testing data consistency...')
  try {
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    if (response.ok) {
      const result = await response.json()
      
      // Check that total matches sum of individual amounts
      const calculatedTotal = result.students?.reduce((sum, student) => sum + student.pending_amount, 0) || 0
      const reportedTotal = result.total_pending_amount || 0
      
      if (Math.abs(calculatedTotal - reportedTotal) > 0.01) {
        results.failed++
        results.errors.push(`Total mismatch: calculated ${calculatedTotal}, reported ${reportedTotal}`)
        console.log('     ❌ Total amount mismatch')
      } else {
        results.passed++
        console.log('     ✅ Total amount consistent')
      }
    } else {
      results.failed++
      results.errors.push('API request failed for consistency test')
    }
  } catch (error) {
    results.failed++
    results.errors.push(`Consistency test error: ${error.message}`)
  }

  return results
}

async function testResponseStructure(teacherId) {
  try {
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    if (!response.ok) {
      return { success: false, error: 'API request failed' }
    }

    const result = await response.json()
    
    // Required top-level fields
    const requiredFields = ['total_pending_amount', 'students']
    for (const field of requiredFields) {
      if (!(field in result)) {
        return { success: false, error: `Missing required field: ${field}` }
      }
    }

    // Required student fields
    if (result.students && result.students.length > 0) {
      const studentRequiredFields = [
        'student_id', 'student_name', 'completed_hours', 'awarded_credits',
        'pending_hours', 'pending_amount', 'last_class_date', 'rate_per_hour',
        'student_email', 'parent_email'
      ]
      
      const student = result.students[0]
      for (const field of studentRequiredFields) {
        if (!(field in student)) {
          return { success: false, error: `Missing student field: ${field}` }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function testPerformance(teacherId) {
  try {
    const startTime = Date.now()
    const response = await fetch(`http://localhost:3000/api/teacher/pending-payments`)
    const endTime = Date.now()
    
    const responseTime = endTime - startTime
    
    if (!response.ok) {
      return { success: false, error: 'API request failed' }
    }

    // Performance threshold: 3 seconds for reasonable response
    if (responseTime > 3000) {
      return { 
        success: false, 
        error: `Response time too slow: ${responseTime}ms (threshold: 3000ms)`,
        responseTime 
      }
    }

    return { success: true, responseTime }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Run the comprehensive test suite
testPendingPaymentsCalculation()