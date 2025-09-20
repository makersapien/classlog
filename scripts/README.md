# Test Scripts for Credit Management System

This directory contains test scripts for verifying the credit management system functionality.

## Overview

The credit management system consists of several components that work together:

1. **Credits API** - Handles credit transactions (purchase, deduction, adjustment, refund)
2. **Schedule Slots API** - Manages class schedule slots and booking
3. **Class Logs API** - Tracks class sessions and completion
4. **StudentCard Component** - Displays student credit information in the UI
5. **Database Functions** - SQL functions for managing credit transactions

## Test Scripts

### Integration Tests

- **test-integration-e2e.js** - Comprehensive end-to-end test that verifies all components work together correctly
  - Tests credit award functionality
  - Tests schedule slot creation and booking
  - Tests credit deduction for slot booking
  - Tests class completion and credit deduction (if available)

### Component Tests

- **test-credits-api.js** - Tests the credits API endpoints
- **test-schedule-slots-api.js** - Tests the schedule slots API endpoints
- **test-payments-api.js** - Tests the payments API endpoints for credit awards
- **test-dashboard-api.js** - Tests the dashboard API endpoints with different user roles
- **test-credit-award-e2e.js** - Tests the credit award flow
- **test-schedule-slot-e2e.js** - Tests the schedule slot creation and booking flow
- **test-student-card-display.js** - Tests the StudentCard component's credit display
- **test-student-card-credit-display.js** - Tests the StudentCard component's credit display with both legacy and new formats

## Running the Tests

Before running the tests, you need to:

1. Start your local development server
2. Replace the placeholder values in the test scripts with valid values from your database
3. Set the authentication cookies for teacher and student accounts

### Required Environment Variables

You can set these as environment variables or replace them directly in the scripts:

- `AUTH_COOKIE` - Authentication cookie for API requests
- `TEACHER_AUTH_COOKIE` - Authentication cookie for a teacher account
- `STUDENT_AUTH_COOKIE` - Authentication cookie for a student account
- `TEST_TEACHER_ID` - Valid teacher ID from your database
- `TEST_STUDENT_ID` - Valid student ID from your database
- `TEST_PARENT_EMAIL` - Valid parent email from your database

### Running a Test

```bash
# Run the integration test
node scripts/test-integration-e2e.js

# Run component tests
node scripts/test-credits-api.js
node scripts/test-schedule-slots-api.js
node scripts/test-credit-award-e2e.js
node scripts/test-schedule-slot-e2e.js
node scripts/test-student-card-display.js
node scripts/test-student-card-credit-display.js
```

## Getting Authentication Cookies

To get the authentication cookies:

1. Log in to the application in your browser
2. Open browser developer tools (F12)
3. Go to the Application/Storage tab
4. Find the "sb-auth-token" cookie under Cookies
5. Copy its value

## Test Data Requirements

For the tests to run successfully, you need:

1. A teacher account with permissions to manage credits and schedule slots
2. A student account with an active credit account
3. A parent account associated with the student
4. Sufficient credits in the student's account for booking slots

## Troubleshooting

If the tests fail, check:

1. That your local server is running
2. That you've replaced all placeholder values with valid data
3. That the authentication cookies are valid and not expired
4. That the database has the required functions and triggers installed
5. That the user accounts have the correct permissions

## Database Schema Requirements

The tests expect the following database schema:

1. `credits` table with fields: id, student_id, teacher_id, balance_hours, total_purchased, total_used, is_active
2. `credit_transactions` table with fields: id, credit_account_id, transaction_type, hours_amount, balance_after, description, reference_id, reference_type
3. `schedule_slots` table with fields: id, teacher_id, date, start_time, end_time, status, student_id
4. `class_logs` table with fields: id, teacher_id, student_id, status, content, duration_minutes

And the following database functions:

1. `manage_credit_transaction` - Handles credit transactions
2. `book_schedule_slot` - Books a schedule slot and deducts credits
3. `handle_class_completion` - Trigger function for class completion