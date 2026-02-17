#!/usr/bin/env node

/**
 * Complete Flow Integration Test
 * Tests both student and parent flows together
 */

const StudentFlowTester = require('./test-student-flow-comprehensive');
const ParentFlowTester = require('./test-parent-flow-comprehensive');

class CompleteFlowTester {
  constructor() {
    this.results = {
      student: null,
      parent: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async runCompleteTests() {
    this.log('Starting complete flow integration tests...');
    
    try {
      // Run student flow tests
      this.log('Running student flow tests...');
      const studentTester = new StudentFlowTester();
      this.results.student = await studentTester.runAllTests();

      // Run parent flow tests
      this.log('Running parent flow tests...');
      const parentTester = new ParentFlowTester();
      this.results.parent = await parentTester.runAllTests();

      // Generate summary report
      this.generateSummaryReport();

      return this.results;
    } catch (error) {
      this.log(`Complete flow test failed: ${error.message}`, 'error');
      throw error;
    }
  }

  generateSummaryReport() {
    this.log('\n=== COMPLETE FLOW TEST SUMMARY ===');
    
    const studentPassed = Object.values(this.results.student).filter(Boolean).length;
    const studentTotal = Object.keys(this.results.student).length;
    const parentPassed = Object.values(this.results.parent).filter(Boolean).length;
    const parentTotal = Object.keys(this.results.parent).length;
    
    const totalPassed = studentPassed + parentPassed;
    const totalTests = studentTotal + parentTotal;

    this.log(`Overall: ${totalPassed}/${totalTests} tests passed`);
    this.log(`Student Flow: ${studentPassed}/${studentTotal} tests passed`);
    this.log(`Parent Flow: ${parentPassed}/${parentTotal} tests passed`);

    this.log('\nDetailed Results:');
    this.log('STUDENT FLOW:');
    Object.entries(this.results.student).forEach(([test, passed]) => {
      this.log(`  ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });

    this.log('PARENT FLOW:');
    Object.entries(this.results.parent).forEach(([test, passed]) => {
      this.log(`  ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });

    const allPassed = totalPassed === totalTests;
    this.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);
    
    return allPassed;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CompleteFlowTester();
  tester.runCompleteTests()
    .then(results => {
      const studentAllPassed = Object.values(results.student).every(Boolean);
      const parentAllPassed = Object.values(results.parent).every(Boolean);
      const allPassed = studentAllPassed && parentAllPassed;
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Complete flow test suite failed:', error);
      process.exit(1);
    });
}

module.exports = CompleteFlowTester;