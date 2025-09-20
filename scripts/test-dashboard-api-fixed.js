// Test script for the fixed dashboard API implementation
const fetch = require('node-fetch');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test the dashboard API with different user roles
async function testDashboardApi(authToken) {
  console.log(`${colors.blue}Starting dashboard API tests...${colors.reset}`);
  console.log(`${colors.cyan}==================================${colors.reset}`);
  
  // Track test results
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  try {
    // Test the dashboard API with different roles
    const roles = ['teacher', 'student', 'parent'];
    
    for (const role of roles) {
      results.total++;
      console.log(`${colors.cyan}Testing dashboard API with role: ${role}${colors.reset}`);
      
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3000/api/dashboard?role=${role}`, {
        method: 'GET',
        headers: {
          'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=${authToken}`
        }
      });
      const endTime = Date.now();
      
      const data = await response.json();
      
      console.log(`Response status for ${role}: ${response.status}`);
      console.log(`Response time: ${endTime - startTime}ms`);
      
      // Check for cookie-related errors in the response
      const hasCookieError = 
        data.error && 
        (data.error.includes('cookie') || 
         data.error.includes('Cookie') || 
         (data.details && data.details.includes('cookie')));
      
      if (response.ok && !hasCookieError) {
        results.passed++;
        console.log(`${colors.green}✅ Test passed for ${role}: Dashboard API returned success response${colors.reset}`);
        
        // Verify that the response contains the expected data structure
        console.log(`${colors.blue}Verifying response data structure...${colors.reset}`);
        
        // Check for common dashboard data properties based on role
        if (role === 'teacher') {
          if (data.stats && data.classes && data.classLogs) {
            console.log(`${colors.green}✅ Teacher dashboard data structure is valid${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ Teacher dashboard data structure may be incomplete${colors.reset}`);
            console.log(`Missing properties: ${!data.stats ? 'stats, ' : ''}${!data.classes ? 'classes, ' : ''}${!data.classLogs ? 'classLogs, ' : ''}`);
          }
        } else if (role === 'student') {
          if (data.stats && data.enrollments) {
            console.log(`${colors.green}✅ Student dashboard data structure is valid${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ Student dashboard data structure may be incomplete${colors.reset}`);
            console.log(`Missing properties: ${!data.stats ? 'stats, ' : ''}${!data.enrollments ? 'enrollments, ' : ''}`);
          }
        } else if (role === 'parent') {
          if (data.stats && data.children) {
            console.log(`${colors.green}✅ Parent dashboard data structure is valid${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ Parent dashboard data structure may be incomplete${colors.reset}`);
            console.log(`Missing properties: ${!data.stats ? 'stats, ' : ''}${!data.children ? 'children, ' : ''}`);
          }
        }
        
        // Print a sample of the data
        console.log(`${colors.blue}Sample data for ${role}:${colors.reset}`);
        console.log(JSON.stringify(data, null, 2).substring(0, 300) + '...');
      } else {
        results.failed++;
        console.log(`${colors.red}❌ Test failed for ${role}: Dashboard API returned error response${colors.reset}`);
        console.log(`${colors.red}Error details:${colors.reset}`, data.error, data.details);
        
        if (hasCookieError) {
          console.log(`${colors.red}❌ Cookie-related error detected!${colors.reset}`);
        }
      }
      
      console.log(`${colors.cyan}-----------------------------------${colors.reset}`);
    }
    
    // Test with invalid role
    results.total++;
    console.log(`${colors.cyan}Testing dashboard API with invalid role${colors.reset}`);
    
    const invalidResponse = await fetch(`http://localhost:3000/api/dashboard?role=invalid`, {
      method: 'GET',
      headers: {
        'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=${authToken}`
      }
    });
    
    const invalidData = await invalidResponse.json();
    
    if (invalidResponse.status === 400 && invalidData.error) {
      results.passed++;
      console.log(`${colors.green}✅ Test passed for invalid role: API correctly returned 400 error${colors.reset}`);
    } else {
      results.failed++;
      console.log(`${colors.red}❌ Test failed for invalid role: API should return 400 error${colors.reset}`);
    }
    
    // Test without role parameter
    results.total++;
    console.log(`${colors.cyan}Testing dashboard API without role parameter${colors.reset}`);
    
    const noRoleResponse = await fetch(`http://localhost:3000/api/dashboard`, {
      method: 'GET',
      headers: {
        'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=${authToken}`
      }
    });
    
    const noRoleData = await noRoleResponse.json();
    
    if (noRoleResponse.status === 400 && noRoleData.error) {
      results.passed++;
      console.log(`${colors.green}✅ Test passed for missing role: API correctly returned 400 error${colors.reset}`);
    } else {
      results.failed++;
      console.log(`${colors.red}❌ Test failed for missing role: API should return 400 error${colors.reset}`);
    }
    
    // Test with invalid auth token
    results.total++;
    console.log(`${colors.cyan}Testing dashboard API with invalid auth token${colors.reset}`);
    
    const invalidAuthResponse = await fetch(`http://localhost:3000/api/dashboard?role=teacher`, {
      method: 'GET',
      headers: {
        'Cookie': `sb-ptacvbijmjoteceybnod-auth-token=invalid_token`
      }
    });
    
    const invalidAuthData = await invalidAuthResponse.json();
    
    if (invalidAuthResponse.status === 401 && invalidAuthData.error) {
      results.passed++;
      console.log(`${colors.green}✅ Test passed for invalid auth: API correctly returned 401 error${colors.reset}`);
    } else {
      results.failed++;
      console.log(`${colors.red}❌ Test failed for invalid auth: API should return 401 error${colors.reset}`);
    }
    
    // Print test summary
    console.log(`${colors.cyan}==================================${colors.reset}`);
    console.log(`${colors.blue}Test Summary:${colors.reset}`);
    console.log(`${colors.white}Total tests: ${results.total}${colors.reset}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    
    if (results.failed === 0) {
      console.log(`${colors.green}✅ All tests passed! The dashboard API is working correctly.${colors.reset}`);
      console.log(`${colors.green}✅ No cookie-related errors were detected.${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Some tests failed. Please check the error details above.${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Test failed with exception:${colors.reset}`, error);
  } finally {
    rl.close();
  }
}

// Main function
async function main() {
  console.log(`${colors.yellow}Dashboard API Test Script${colors.reset}`);
  console.log(`${colors.yellow}=======================${colors.reset}`);
  console.log("This script tests the dashboard API with different user roles.");
  console.log("It verifies that no cookie-related errors appear and that all data is correctly displayed.");
  console.log("");
  
  // Get auth token from user
  const authToken = await prompt("Please enter a valid auth token: ");
  
  if (!authToken) {
    console.log(`${colors.red}No auth token provided. Exiting.${colors.reset}`);
    rl.close();
    return;
  }
  
  await testDashboardApi(authToken);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  rl.close();
});