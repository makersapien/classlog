#!/usr/bin/env node

/**
 * Core Functionality Test
 * Tests the main features without creating database records
 */

require('dotenv').config({ path: '.env.local' });

class CoreFunctionalityTester {
  constructor() {
    this.testResults = [];
    this.baseUrl = 'http://localhost:3000';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, type, message });
  }

  async testEndpoint(endpoint, method = 'GET', body = null, expectedStatus = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const status = response.status;
      
      this.log(`${method} ${endpoint} -> ${status}`);
      
      if (expectedStatus && status !== expectedStatus) {
        this.log(`Expected ${expectedStatus}, got ${status}`, 'warn');
      }

      return {
        status,
        ok: response.ok,
        data: response.ok ? await response.json().catch(() => null) : null
      };
    } catch (error) {
      this.log(`${method} ${endpoint} -> ERROR: ${error.message}`, 'error');
      return { status: 0, ok: false, error: error.message };
    }
  }

  async testAuthEndpoints() {
    this.log('Testing authentication endpoints...');
    
    const tests = [
      { endpoint: '/api/auth/me', expectedStatus: 401 },
      { endpoint: '/api/dashboard', expectedStatus: 401 },
      { endpoint: '/api/credits', expectedStatus: 401 }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.testEndpoint(test.endpoint, 'GET', null, test.expectedStatus);
      if (result.status === test.expectedStatus) {
        passed++;
      }
    }

    this.log(`Auth endpoints: ${passed}/${tests.length} passed`);
    return passed === tests.length;
  }

  async testTeacherEndpoints() {
    this.log('Testing teacher endpoints...');
    
    const tests = [
      { endpoint: '/api/teacher/students', expectedStatus: 401 },
      { endpoint: '/api/teacher/pending-payments', expectedStatus: 401 },
      { endpoint: '/api/schedule-slots', expectedStatus: 401 }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.testEndpoint(test.endpoint, 'GET', null, test.expectedStatus);
      if (result.status === test.expectedStatus) {
        passed++;
      }
    }

    this.log(`Teacher endpoints: ${passed}/${tests.length} passed`);
    return passed === tests.length;
  }

  async testBookingEndpoints() {
    this.log('Testing booking endpoints...');
    
    const tests = [
      { endpoint: '/api/booking/invalid-token/calendar', expectedStatus: [400, 401, 500] },
      { endpoint: '/api/booking/invalid-token/my-bookings', expectedStatus: [400, 401, 500] }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.testEndpoint(test.endpoint);
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      if (expectedStatuses.includes(result.status)) {
        passed++;
      }
    }

    this.log(`Booking endpoints: ${passed}/${tests.length} passed`);
    return passed === tests.length;
  }

  async testStaticPages() {
    this.log('Testing static pages...');
    
    const tests = [
      { endpoint: '/', expectedStatus: 200 },
      { endpoint: '/dashboard', expectedStatus: [200, 302, 401] }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.testEndpoint(test.endpoint);
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      if (expectedStatuses.includes(result.status)) {
        passed++;
      }
    }

    this.log(`Static pages: ${passed}/${tests.length} passed`);
    return passed === tests.length;
  }

  async runAllTests() {
    this.log('Starting core functionality tests...');
    
    try {
      const results = {
        auth: await this.testAuthEndpoints(),
        teacher: await this.testTeacherEndpoints(),
        booking: await this.testBookingEndpoints(),
        static: await this.testStaticPages()
      };

      const passedTests = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      this.log(`\n=== CORE FUNCTIONALITY TEST RESULTS ===`);
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
  const tester = new CoreFunctionalityTester();
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

module.exports = CoreFunctionalityTester;