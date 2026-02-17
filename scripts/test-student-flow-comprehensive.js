#!/usr/bin/env node

/**
 * Comprehensive Student Flow Test
 * Tests: Login, Booking Management, Credit System
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class StudentFlowTester {
  constructor() {
    this.testResults = [];
    this.studentId = null;
    this.teacherId = null;
    this.bookingToken = null;
    this.slotId = null;
    this.bookingId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async setupTestData() {
    this.log('Setting up test data...');
    
    try {
      // Create test teacher
      this.teacherId = generateUUID();
      const { data: teacher, error: teacherError } = await supabase
        .from('profiles')
        .insert({
          id: this.teacherId,
          email: 'teacher@test.com',
          full_name: 'Test Teacher',
          role: 'teacher'
        })
        .select()
        .single();

      if (teacherError) throw teacherError;
      this.log(`Created test teacher: ${this.teacherId}`);

      // Create test student
      this.studentId = generateUUID();
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .insert({
          id: this.studentId,
          email: 'student@test.com',
          full_name: 'Test Student',
          role: 'student'
        })
        .select()
        .single();

      if (studentError) throw studentError;
      this.log(`Created test student: ${this.studentId}`);

      // Create credits for student
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .insert({
          student_id: this.studentId,
          teacher_id: this.teacherId,
          balance_hours: 10,
          total_purchased: 10,
          total_used: 0,
          rate_per_hour: 500,
          is_active: true
        })
        .select()
        .single();

      if (creditsError) throw creditsError;
      this.log(`Created credits for student: ${credits.id}`);

      // Create share token
      const { data: token, error: tokenError } = await supabase
        .from('share_tokens')
        .insert({
          teacher_id: this.teacherId,
          student_id: this.studentId,
          token: 'test-token-' + Date.now(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          access_count: 0
        })
        .select()
        .single();

      if (tokenError) throw tokenError;
      this.bookingToken = token.token;
      this.log(`Created share token: ${this.bookingToken}`);

      // Create test schedule slot
      const slotDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const { data: slot, error: slotError } = await supabase
        .from('schedule_slots')
        .insert({
          teacher_id: this.teacherId,
          date: slotDate.toISOString().split('T')[0],
          start_time: slotDate.toTimeString().split(' ')[0],
          end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toTimeString().split(' ')[0],
          duration_minutes: 60,
          status: 'available',
          max_students: 1
        })
        .select()
        .single();

      if (slotError) throw slotError;
      this.slotId = slot.id;
      this.log(`Created test slot: ${this.slotId}`);

    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testStudentLogin() {
    this.log('Testing student login flow...');
    
    try {
      // Test auth status endpoint
      const response = await fetch(`http://localhost:3000/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `student_id=${this.studentId}`
        }
      });

      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }

      const authData = await response.json();
      this.log(`Auth response: ${JSON.stringify(authData)}`);
      
      if (authData.user && authData.user.id === this.studentId) {
        this.log('✅ Student login test passed');
        return true;
      } else {
        this.log('❌ Student login test failed - user mismatch', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Student login test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testStudentBookingFlow() {
    this.log('Testing student booking flow...');
    
    try {
      // Test calendar view
      const calendarResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/calendar`);
      if (!calendarResponse.ok) {
        throw new Error(`Calendar fetch failed: ${calendarResponse.status}`);
      }
      
      const calendarData = await calendarResponse.json();
      this.log(`Calendar data: ${JSON.stringify(calendarData)}`);

      // Test booking creation
      const bookingResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schedule_slot_id: this.slotId,
          notes: 'Test booking from student flow'
        })
      });

      if (!bookingResponse.ok) {
        throw new Error(`Booking failed: ${bookingResponse.status}`);
      }

      const bookingData = await bookingResponse.json();
      this.bookingId = bookingData.booking.id;
      this.log(`✅ Booking created: ${this.bookingId}`);

      // Test my bookings view
      const myBookingsResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/my-bookings`);
      if (!myBookingsResponse.ok) {
        throw new Error(`My bookings fetch failed: ${myBookingsResponse.status}`);
      }

      const myBookingsData = await myBookingsResponse.json();
      this.log(`My bookings: ${JSON.stringify(myBookingsData)}`);

      if (myBookingsData.bookings && myBookingsData.bookings.length > 0) {
        this.log('✅ Student booking flow test passed');
        return true;
      } else {
        this.log('❌ Student booking flow test failed - no bookings found', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Student booking flow test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testStudentCreditSystem() {
    this.log('Testing student credit system...');
    
    try {
      // Check initial credits
      const { data: initialCredits, error: creditsError } = await supabase
        .from('credits')
        .select('balance_hours')
        .eq('student_id', this.studentId)
        .single();

      if (creditsError) throw creditsError;
      this.log(`Initial credits: ${initialCredits.balance_hours}`);

      // Test credits API
      const creditsResponse = await fetch(`http://localhost:3000/api/credits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `student_id=${this.studentId}`
        }
      });

      if (!creditsResponse.ok) {
        throw new Error(`Credits API failed: ${creditsResponse.status}`);
      }

      const creditsData = await creditsResponse.json();
      this.log(`Credits API response: ${JSON.stringify(creditsData)}`);

      // Simulate class completion to test credit deduction
      if (this.bookingId) {
        const { data: classLog, error: classLogError } = await supabase
          .from('class_logs')
          .insert({
            teacher_id: this.teacherId,
            student_id: this.studentId,
            booking_id: this.bookingId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'completed',
            payment_status: 'pending'
          })
          .select()
          .single();

        if (classLogError) throw classLogError;
        this.log(`Created class log: ${classLog.id}`);

        // Check credits after class completion
        const { data: finalCredits, error: finalCreditsError } = await supabase
          .from('credits')
          .select('balance_hours')
          .eq('student_id', this.studentId)
          .single();

        if (finalCreditsError) throw finalCreditsError;
        this.log(`Final credits: ${finalCredits.balance_hours}`);

        if (finalCredits.balance_hours < initialCredits.balance_hours) {
          this.log('✅ Student credit system test passed - credits deducted');
          return true;
        } else {
          this.log('❌ Student credit system test failed - credits not deducted', 'error');
          return false;
        }
      }

      this.log('✅ Student credit system test passed');
      return true;
    } catch (error) {
      this.log(`❌ Student credit system test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBookingCancellation() {
    this.log('Testing booking cancellation...');
    
    try {
      if (!this.bookingId) {
        this.log('No booking to cancel, skipping test');
        return true;
      }

      const cancelResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/cancel/${this.bookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!cancelResponse.ok) {
        throw new Error(`Cancellation failed: ${cancelResponse.status}`);
      }

      const cancelData = await cancelResponse.json();
      this.log(`Cancellation response: ${JSON.stringify(cancelData)}`);

      this.log('✅ Booking cancellation test passed');
      return true;
    } catch (error) {
      this.log(`❌ Booking cancellation test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up test data...');
    
    try {
      // Clean up in reverse order of creation
      if (this.bookingId) {
        await supabase.from('bookings').delete().eq('id', this.bookingId);
      }
      if (this.slotId) {
        await supabase.from('schedule_slots').delete().eq('id', this.slotId);
      }
      if (this.bookingToken) {
        await supabase.from('share_tokens').delete().eq('token', this.bookingToken);
      }
      if (this.studentId) {
        await supabase.from('profiles').delete().eq('id', this.studentId);
      }
      if (this.teacherId) {
        await supabase.from('profiles').delete().eq('id', this.teacherId);
      }
      
      this.log('✅ Cleanup completed');
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, 'warn');
    }
  }

  async runAllTests() {
    this.log('Starting comprehensive student flow tests...');
    
    try {
      await this.setupTestData();
      
      const results = {
        login: await this.testStudentLogin(),
        booking: await this.testStudentBookingFlow(),
        credits: await this.testStudentCreditSystem(),
        cancellation: await this.testBookingCancellation()
      };

      await this.cleanup();

      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      this.log(`\n=== STUDENT FLOW TEST RESULTS ===`);
      this.log(`Passed: ${passedTests}/${totalTests}`);
      Object.entries(results).forEach(([test, passed]) => {
        this.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      });

      return results;
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      await this.cleanup();
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new StudentFlowTester();
  tester.runAllTests()
    .then(results => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = StudentFlowTester;