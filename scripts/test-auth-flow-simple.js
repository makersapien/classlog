#!/usr/bin/env node

/**
 * Simple Authentication Flow Test
 * Tests basic API endpoints without creating users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class SimpleAuthFlowTester {
  constructor() {
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async testDashboardAPI() {
    this.log('Testing dashboard API...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.log(`Dashboard API response status: ${response.status}`);
      
      if (response.status === 401) {
        this.log('✅ Dashboard API correctly requires authentication');
        return true;
      } else if (response.ok) {
        const data = await response.json();
        this.log(`Dashboard API response: ${JSON.stringify(data)}`);
        this.log('✅ Dashboard API accessible');
        return true;
      } else {
        this.log(`❌ Dashboard API unexpected status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Dashboard API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCreditsAPI() {
    this.log('Testing credits API...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/credits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.log(`Credits API response status: ${response.status}`);
      
      if (response.status === 401) {
        this.log('✅ Credits API correctly requires authentication');
        return true;
      } else if (response.ok) {
        const data = await response.json();
        this.log(`Credits API response: ${JSON.stringify(data)}`);
        this.log('✅ Credits API accessible');
        return true;
      } else {
        this.log(`❌ Credits API unexpected status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Credits API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testScheduleSlotsAPI() {
    this.log('Testing schedule slots API...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/schedule-slots`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.log(`Schedule slots API response status: ${response.status}`);
      
      if (response.status === 401) {
        this.log('✅ Schedule slots API correctly requires authentication');
        return true;
      } else if (response.ok) {
        const data = await response.json();
        this.log(`Schedule slots API response: ${JSON.stringify(data)}`);
        this.log('✅ Schedule slots API accessible');
        return true;
      } else {
        this.log(`❌ Schedule slots API unexpected status: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Schedule slots API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBookingAPIWithInvalidToken() {
    this.log('Testing booking API with invalid token...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/booking/invalid-token/calendar`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.log(`Booking API response status: ${response.status}`);
      
      if (response.status === 401 || response.status === 400) {
        this.log('✅ Booking API correctly rejects invalid token');
        return true;
      } else {
        this.log(`❌ Booking API should reject invalid token, got: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Booking API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        this.log(`❌ Database connection failed: ${error.message}`, 'error');
        return false;
      }

      this.log('✅ Database connection successful');
      return true;
    } catch (error) {
      this.log(`❌ Database connection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting simple authentication flow tests...');
    
    try {
      const results = {
        database: await this.testDatabaseConnection(),
        dashboard: await this.testDashboardAPI(),
        credits: await this.testCreditsAPI(),
        scheduleSlots: await this.testScheduleSlotsAPI(),
        bookingInvalidToken: await this.testBookingAPIWithInvalidToken()
      };

      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      this.log(`\n=== SIMPLE AUTH FLOW TEST RESULTS ===`);
      this.log(`Passed: ${passedTests}/${totalTests}`);
      Object.entries(results).forEach(([test, passed]) => {
        this.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      });

      return results;
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SimpleAuthFlowTester();
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

module.exports = SimpleAuthFlowTester;