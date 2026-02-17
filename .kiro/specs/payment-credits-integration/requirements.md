# Requirements Document

## Introduction

The ClassLogger Payment & Credits System Integration project aims to connect existing Payment, Credits, and Class Logs systems to work together seamlessly. The goal is to orchestrate existing database tables and APIs without building new systems, focusing on synchronization between credit awards, class logging, and payment tracking. This integration will provide teachers with automated credit deduction, pending payment calculations, and parents with visibility into their child's credit balance.

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to award credits to students using a dropdown selection instead of manual email entry, so that I can quickly select from my existing enrolled students without typing errors.

#### Acceptance Criteria

1. WHEN I open the Award Credits modal THEN the system SHALL display a dropdown populated with all my enrolled students
2. WHEN I select a student from the dropdown THEN the system SHALL capture the student_id for the credit award
3. WHEN I submit the credit award THEN the system SHALL use student_id instead of email for processing
4. IF no students are enrolled THEN the system SHALL display an appropriate message in the dropdown

### Requirement 2

**User Story:** As a teacher, I want to see accurate pending payments calculated from unpaid class hours, so that I know exactly how much each student owes me.

#### Acceptance Criteria

1. WHEN I view my dashboard THEN the system SHALL calculate pending payments from completed but unpaid class logs
2. WHEN calculating pending amounts THEN the system SHALL subtract already awarded credits from total completed hours
3. WHEN displaying pending payments THEN the system SHALL show student name, pending hours, and pending amount
4. IF a student has no pending payments THEN the system SHALL show ₹0 for that student
5. WHEN pending payments exist THEN the system SHALL provide options to remind or award credits

### Requirement 3

**User Story:** As a teacher, I want class sessions to automatically deduct from student credit balances when completed, so that I don't have to manually track which classes were paid for.

#### Acceptance Criteria

1. WHEN I end a class session THEN the system SHALL check the student's available credit balance
2. IF sufficient credits exist THEN the system SHALL deduct the class duration from credits and mark as paid
3. IF partial credits exist THEN the system SHALL deduct available credits and mark as partially paid
4. IF no credits exist THEN the system SHALL mark the class as unpaid
5. WHEN credits are deducted THEN the system SHALL update the class log with credits_deducted and is_paid status
6. WHEN deduction occurs THEN the system SHALL provide feedback showing remaining credit balance

### Requirement 4

**User Story:** As a teacher, I want to see the payment status of each class in my class logs and dashboard, so that I can quickly identify which sessions need payment follow-up.

#### Acceptance Criteria

1. WHEN I view class logs THEN the system SHALL display paid/unpaid status for each class
2. WHEN I view recent payments THEN the system SHALL show credit awards with associated amounts and dates
3. WHEN displaying class status THEN the system SHALL use clear visual indicators (badges) for paid vs unpaid
4. IF a class is paid THEN the system SHALL show a green "PAID" badge
5. IF a class is unpaid THEN the system SHALL show a red "UNPAID" badge

### Requirement 5

**User Story:** As a teacher, I want to send payment reminders to parents for unpaid classes, so that I can follow up on outstanding balances professionally.

#### Acceptance Criteria

1. WHEN I view pending payments THEN the system SHALL provide a "Send Reminder" button for each student
2. WHEN I click send reminder THEN the system SHALL send an email to the parent with payment details
3. WHEN sending reminders THEN the system SHALL include student name, amount due, and hours completed
4. IF reminder is sent successfully THEN the system SHALL provide confirmation feedback
5. WHEN reminder fails THEN the system SHALL display an appropriate error message

### Requirement 6

**User Story:** As a parent, I want to see my child's credit balance and class payment history, so that I can track usage and plan future payments.

#### Acceptance Criteria

1. WHEN I access my parent dashboard THEN the system SHALL display my child's current credit balance
2. WHEN viewing credit information THEN the system SHALL show credits awarded, used, and remaining
3. WHEN displaying class history THEN the system SHALL indicate which classes were paid vs pending
4. IF credits are running low THEN the system SHALL highlight the need for additional payment
5. WHEN viewing payment history THEN the system SHALL show total paid amount and pending balance

### Requirement 7

**User Story:** As a system administrator, I want all existing functionality to remain intact during the integration, so that current users experience no disruption.

#### Acceptance Criteria

1. WHEN the integration is deployed THEN all existing API endpoints SHALL continue to function
2. WHEN existing data is accessed THEN the system SHALL return accurate historical information
3. IF schema changes are required THEN the system SHALL maintain backward compatibility
4. WHEN new features are added THEN existing user workflows SHALL remain unchanged
5. IF errors occur THEN the system SHALL not corrupt existing data

### Requirement 8

**User Story:** As a teacher, I want the system to prevent double-deduction of credits for the same class, so that student balances remain accurate.

#### Acceptance Criteria

1. WHEN a class is marked as completed THEN the system SHALL check if credits were already deducted
2. IF credits were previously deducted THEN the system SHALL not deduct again
3. WHEN processing credit deduction THEN the system SHALL use atomic transactions to prevent race conditions
4. IF deduction fails THEN the system SHALL rollback any partial changes
5. WHEN viewing class logs THEN the system SHALL clearly show the deduction status