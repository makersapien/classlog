# Dashboard API Test Script

This script tests the dashboard API with different user roles to verify that the cookie handling fix is working correctly.

## Purpose

The test script verifies:

1. That the dashboard API correctly handles cookies asynchronously
2. That no cookie-related errors appear in the responses
3. That all dashboard data is correctly displayed for different user roles
4. That the API correctly handles invalid inputs

## Prerequisites

Before running the test script, you need:

1. A running local development server (http://localhost:3000)
2. A valid authentication token from a user with access to all roles (teacher, student, parent)

## How to Get an Authentication Token

1. Log in to the application in your browser
2. Open browser developer tools (F12)
3. Go to the Application/Storage tab
4. Find the "sb-ptacvbijmjoteceybnod-auth-token" cookie under Cookies
5. Copy its value

## Running the Test

```bash
# Run the test script
node scripts/test-dashboard-api-fixed.js
```

The script will prompt you to enter a valid authentication token. After entering the token, the script will run the tests and display the results.

## Test Cases

The script tests the following scenarios:

1. Dashboard API with teacher role
2. Dashboard API with student role
3. Dashboard API with parent role
4. Dashboard API with invalid role
5. Dashboard API without role parameter
6. Dashboard API with invalid authentication token

## Interpreting the Results

The script will display a summary of the test results, including:

- Total number of tests run
- Number of tests passed
- Number of tests failed
- Detailed information about each test case

If all tests pass, the dashboard API is working correctly and the cookie handling fix is successful.

## Troubleshooting

If any tests fail, check:

1. That your local server is running
2. That you've entered a valid authentication token
3. That the user associated with the token has access to all roles
4. That the dashboard API implementation is correct

## Manual Verification

In addition to running the test script, you should also manually verify:

1. That the dashboard loads without errors in the browser
2. That no cookie-related errors appear in the browser console
3. That all dashboard data is correctly displayed for different user roles