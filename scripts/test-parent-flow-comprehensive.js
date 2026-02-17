#!/usr/bin/env node

/**
 * Comprehensive Parent Flow Test
 * Tests: Login, Child Management, Booking Management, Credit System
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

class ParentFlowTester {
  constructor() {
    this.testResults = [];
    this.parentId = null;
    this.childId = null;
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
    this.log('Setting up parent flow test data...');
    
    try {
      // Create test teacher
      this.teacherId = generateUUID();
      const { data: teacher, error: teacherError } = await supabase
        .from('profiles')
        .insert({
          id: this.teacherId,
          email: 'teacher.parent@test.com',
          full_name: 'Test Teacher for Parent',
          role: 'teacher'
        })
        .select()
        .single();

      if (teacherError) throw teacherError;
      this.log(`Created test teacher: ${this.teacherId}`);

      // Create test parent
      this.parentId = generateUUID();
      const { data: parent, error: parentError } = await supabase
        .from('profiles')
        .insert({
          id: this.parentId,
          email: 'parent@test.com',
          full_name: 'Test Parent',
          role: 'parent'
        })
        .select()
        .single();

      if (parentError) throw parentError;
      this.log(`Created test parent: ${this.parentId}`);

      // Create test child (student)
      this.childId = generateUUID();
      const { data: child, error: childError } = await supabase
        .from('profiles')
        .insert({
          id: this.childId,
          email: 'child@test.com',
          full_name: 'Test Child',
          role: 'student',
          parent_id: this.parentId
        })
        .select()
        .single();

      if (childError) throw childError;
      this.log(`Created test child: ${this.childId}`);

      // Create credits for parent (managing child's credits)
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .insert({
          parent_id: this.parentId,
          student_id: this.childId,
          teacher_id: this.teacherId,
          balance_hours: 20,
          total_purchased: 20,
          total_used: 0,
          rate_per_hour: 500,
          is_active: true
        })
        .select()
        .single();

      if (creditsError) throw creditsError;
      this.log(`Created credits for parent: ${credits.id}`);

      // Create share token for child
      const { data: token, error: tokenError } = await supabase
        .from('share_tokens')
        .insert({
          teacher_id: this.teacherId,
          student_id: this.childId,
          token: 'test-parent-token-' + Date.now(),
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

  async testParentLogin() {
    this.log('Testing parent login flow...');
    
    try {
      // Test auth status endpoint
      const response = await fetch(`http://localhost:3000/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `parent_id=${this.parentId}`
        }
      });

      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }

      const authData = await response.json();
      this.log(`Auth response: ${JSON.stringify(authData)}`);
      
      if (authData.user && authData.user.id === this.parentId) {
        this.log('✅ Parent login test passed');
        return true;
      } else {
        this.log('❌ Parent login test failed - user mismatch', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Parent login test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testParentDashboard() {
    this.log('Testing parent dashboard access...');
    
    try {
      // Test dashboard API
      const dashboardResponse = await fetch(`http://localhost:3000/api/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `parent_id=${this.parentId}`
        }
      });

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API failed: ${dashboardResponse.status}`);
      }

      const dashboardData = await dashboardResponse.json();
      this.log(`Dashboard data: ${JSON.stringify(dashboardData)}`);

      if (dashboardData.user && dashboardData.user.role === 'parent') {
        this.log('✅ Parent dashboard test passed');
        return true;
      } else {
        this.log('❌ Parent dashboard test failed - incorrect role', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Parent dashboard test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testChildBookingManagement() {
    this.log('Testing child booking management...');
    
    try {
      // Test booking creation for child
      const bookingResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schedule_slot_id: this.slotId,
          notes: 'Test booking from parent for child'
        })
      });

      if (!bookingResponse.ok) {
        throw new Error(`Child booking failed: ${bookingResponse.status}`);
      }

      const bookingData = await bookingResponse.json();
      this.bookingId = bookingData.booking.id;
      this.log(`✅ Child booking created: ${this.bookingId}`);

      // Test viewing child's bookings
      const myBookingsResponse = await fetch(`http://localhost:3000/api/booking/${this.bookingToken}/my-bookings`);
      if (!myBookingsResponse.ok) {
        throw new Error(`Child bookings fetch failed: ${myBookingsResponse.status}`);
      }

      const myBookingsData = await myBookingsResponse.json();
      this.log(`Child bookings: ${JSON.stringify(myBookingsData)}`);

      if (myBookingsData.bookings && myBookingsData.bookings.length > 0) {
        this.log('✅ Child booking management test passed');
        return true;
      } else {
        this.log('❌ Child booking management test failed - no bookings found', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Child booking management test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testParentCreditSystem() {
    this.log('Testing parent credit system...');
    
    try {
      // Check initial parent credits
      const { data: initialCredits, error: creditsError } = await supabase
        .from('credits')
        .select('balance_hours')
        .eq('parent_id', this.parentId)
        .single();

      if (creditsError) throw creditsError;
      this.log(`Initial parent credits: ${initialCredits.balance_hours}`);

      // Test credits API for parent
      const creditsResponse = await fetch(`http://localhost:3000/api/credits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `parent_id=${this.parentId}`
        }
      });

      if (!creditsResponse.ok) {
        throw new Error(`Parent credits API failed: ${creditsResponse.status}`);
      }

      const creditsData = await creditsResponse.json();
      this.log(`Parent credits API response: ${JSON.stringify(creditsData)}`);

      // Simulate class completion to test credit deduction from parent
      if (this.bookingId) {
        const { data: classLog, error: classLogError } = await supabase
          .from('class_logs')
          .insert({
            teacher_id: this.teacherId,
            student_id: this.childId,
            booking_id: this.bookingId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'completed',
            payment_status: 'pending'
          })
          .select()
          .single();

        if (classLogError) throw classLogError;
        this.log(`Created class log for child: ${classLog.id}`);

        // Check parent credits after child's class completion
        const { data: finalCredits, error: finalCreditsError } = await supabase
          .from('credits')
          .select('balance_hours')
          .eq('parent_id', this.parentId)
          .single();

        if (finalCreditsError) throw finalCreditsError;
        this.log(`Final parent credits: ${finalCredits.balance_hours}`);

        if (finalCredits.balance_hours < initialCredits.balance_hours) {
          this.log('✅ Parent credit system test passed - credits deducted from parent');
          return true;
        } else {
          this.log('❌ Parent credit system test failed - credits not deducted from parent', 'error');
          return false;
        }
      }

      this.log('✅ Parent credit system test passed');
      return true;
    } catch (error) {
      this.log(`❌ Parent credit system test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testChildManagement() {
    this.log('Testing child management features...');
    
    try {
      // Test fetching children
      const { data: children, error: childrenError } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', this.parentId);

      if (childrenError) throw childrenError;
      this.log(`Found ${children.length} children for parent`);

      if (children.length > 0 && children[0].id === this.childId) {
        this.log('✅ Child management test passed');
        return true;
      } else {
        this.log('❌ Child management test failed - child not found', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Child management test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBookingCancellation() {
    this.log('Testing booking cancellation by parent...');
    
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

      this.log('✅ Booking cancellation by parent test passed');
      return true;
    } catch (error) {
      this.log(`❌ Booking cancellation by parent test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up parent flow test data...');
    
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
      if (this.childId) {
        await supabase.from('profiles').delete().eq('id', this.childId);
      }
      if (this.parentId) {
        await supabase.from('profiles').delete().eq('id', this.parentId);
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
    this.log('Starting comprehensive parent flow tests...');
    
    try {
      await this.setupTestData();
      
      const results = {
        login: await this.testParentLogin(),
        dashboard: await this.testParentDashboard(),
        childBooking: await this.testChildBookingManagement(),
        credits: await this.testParentCreditSystem(),
        childManagement: await this.testChildManagement(),
        cancellation: await this.testBookingCancellation()
      };

      await this.cleanup();

      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      this.log(`\n=== PARENT FLOW TEST RESULTS ===`);
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
  const tester = new ParentFlowTester();
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

module.exports = ParentFlowTester;