# Design Document

## Overview

The Payment & Credits System Integration connects existing payment tracking, credit management, and class logging systems to create a seamless workflow for teachers and parents. The design leverages existing database tables (`credits`, `credit_transactions`, `class_logs`, `profiles`, `enrollments`) and API endpoints while adding minimal new functionality to orchestrate the integration.

## Architecture

### System Components

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Award Credits Modal] --> B[Student Dropdown]
        C[Teacher Dashboard] --> D[Pending Payments Display]
        E[Class Logs View] --> F[Payment Status Badges]
        G[Parent Dashboard] --> H[Credit Balance View]
    end
    
    subgraph "API Layer"
        I[/api/teacher/students] --> J[Student List Endpoint]
        K[/api/credits] --> L[Credit Management]
        M[/api/payments] --> N[Payment Tracking]
        O[/api/class-logs] --> P[Class Session Management]
    end
    
    subgraph "Database Layer"
        Q[(credits)] --> R[(credit_transactions)]
        S[(class_logs)] --> T[(profiles)]
        U[(enrollments)] --> V[(parent_child_relationships)]
    end
    
    A --> I
    C --> K
    E --> O
    G --> K
    
    I --> T
    K --> Q
    M --> Q
    O --> S
```

### Data Flow Architecture

The integration follows a credit lifecycle:

1. **Payment Receipt**: Teacher receives payment from parent
2. **Credit Award**: Teacher uses modal to award credits to student
3. **Class Execution**: Teacher conducts and logs class session
4. **Automatic Deduction**: System deducts credits when class ends
5. **Balance Tracking**: System maintains accurate credit balances
6. **Payment Reminders**: System identifies and enables reminders for unpaid sessions

## Components and Interfaces

### 1. Enhanced Award Credits Modal

**Current State**: Modal accepts manual email input
**Enhanced State**: Modal uses student dropdown with existing enrollments

```typescript
interface AwardCreditsModalProps {
  teacherId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StudentOption {
  id: string
  name: string
  email: string
  subject: string
  parent_email: string
}
```

**Key Changes**:
- Replace email input with searchable dropdown
- Pre-populate student data from enrollments
- Validate student selection before submission
- Use `student_id` instead of `parent_email` for credit awards

### 2. Pending Payments Calculator

**Purpose**: Calculate unpaid class hours by comparing completed classes with awarded credits

```typescript
interface PendingPayment {
  student_id: string
  student_name: string
  completed_hours: number
  awarded_credits: number
  pending_hours: number
  pending_amount: number
  last_class_date: string
  rate_per_hour: number
}

interface PendingPaymentsResponse {
  total_pending_amount: number
  students: PendingPayment[]
}
```

**Calculation Logic**:
```sql
-- Core pending payments query
SELECT 
  cl.student_id,
  s.full_name as student_name,
  SUM(cl.duration_minutes/60.0) as completed_hours,
  COALESCE(SUM(ct.hours_amount), 0) as awarded_credits,
  (SUM(cl.duration_minutes/60.0) - COALESCE(SUM(ct.hours_amount), 0)) as pending_hours,
  t.rate_per_hour * (SUM(cl.duration_minutes/60.0) - COALESCE(SUM(ct.hours_amount), 0)) as pending_amount
FROM class_logs cl
LEFT JOIN credit_transactions ct ON ct.reference_id = cl.id AND ct.reference_type = 'class_log'
JOIN profiles s ON cl.student_id = s.id  
JOIN profiles t ON cl.teacher_id = t.id
WHERE cl.teacher_id = ? AND cl.status = 'completed'
GROUP BY cl.student_id, s.full_name, t.rate_per_hour
HAVING pending_hours > 0
```

### 3. Automatic Credit Deduction System

**Purpose**: Automatically deduct credits when classes are marked as completed

```typescript
interface CreditDeductionResult {
  success: boolean
  credits_deducted: number
  remaining_balance: number
  is_fully_paid: boolean
  partial_payment: boolean
}
```

**Enhanced Class Log Schema**:
```sql
-- Add tracking fields to class_logs table
ALTER TABLE class_logs ADD COLUMN IF NOT EXISTS credits_deducted DECIMAL(10,2) DEFAULT 0;
ALTER TABLE class_logs ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE class_logs ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
```

**Deduction Logic**:
1. When class status changes to 'completed'
2. Query student's current credit balance
3. Calculate class duration in hours
4. Attempt to deduct credits:
   - Full deduction if sufficient credits
   - Partial deduction if some credits available
   - No deduction if no credits available
5. Update class_logs with deduction details
6. Create credit_transaction record

### 4. Payment Status Display System

**Purpose**: Show payment status across all class-related interfaces

```typescript
interface PaymentStatusBadge {
  status: 'paid' | 'partial' | 'unpaid'
  credits_used: number
  amount_covered: number
  amount_pending: number
}
```

**Display Rules**:
- **Paid**: `is_paid = true` → Green badge "✓ PAID"
- **Partial**: `credits_deducted > 0 AND is_paid = false` → Yellow badge "◐ PARTIAL"
- **Unpaid**: `credits_deducted = 0 AND is_paid = false` → Red badge "✗ UNPAID"

### 5. Payment Reminder System

**Purpose**: Send email reminders for unpaid class sessions

```typescript
interface PaymentReminder {
  student_id: string
  parent_email: string
  student_name: string
  pending_amount: number
  pending_hours: number
  last_class_date: string
  teacher_name: string
}
```

**Email Template Structure**:
```
Subject: Payment Reminder - ₹{amount} Due for {student_name}

Hi {parent_name},

This is a friendly reminder that {student_name} has completed {hours} hours 
of {subject} classes totaling ₹{amount}.

Class Details:
- Subject: {subject}
- Hours Completed: {hours}
- Amount Due: ₹{amount}
- Last Class: {last_class_date}

Please arrange payment via:
- UPI: {teacher_upi}
- Direct Contact: {teacher_contact}

Once payment is received, credits will be awarded to your child's account.

Best regards,
{teacher_name}
ClassLogger
```

### 6. Parent Credit Balance View

**Purpose**: Allow parents to view their child's credit usage and balance

```typescript
interface ParentCreditView {
  student_name: string
  current_balance: number
  total_purchased: number
  total_used: number
  pending_payment: number
  recent_classes: ClassSession[]
  recent_purchases: CreditPurchase[]
}

interface ClassSession {
  date: string
  duration_hours: number
  subject: string
  payment_status: 'paid' | 'partial' | 'unpaid'
  credits_used: number
}
```

## Data Models

### Enhanced Credit Transaction Model

```typescript
interface CreditTransaction {
  id: string
  credit_account_id: string
  transaction_type: 'purchase' | 'deduction' | 'adjustment' | 'refund'
  hours_amount: number
  balance_after: number
  description: string
  reference_id: string | null  // Links to class_log.id for deductions
  reference_type: 'payment' | 'class_log' | 'manual_adjustment' | 'system'
  performed_by: string | null
  created_at: string
}
```

### Enhanced Class Log Model

```typescript
interface ClassLog {
  id: string
  teacher_id: string
  student_id: string
  date: string
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  content: string
  
  // New payment tracking fields
  credits_deducted: number
  is_paid: boolean
  payment_status: 'paid' | 'partial' | 'unpaid'
  
  // Existing fields
  start_time: string | null
  end_time: string | null
  student_name: string | null
  student_email: string | null
}
```

### Rate Information Model

```typescript
interface TeacherRate {
  teacher_id: string
  default_rate_per_hour: number
  subject_rates: {
    [subject: string]: number
  }
  student_specific_rates: {
    [student_id: string]: number
  }
}
```

## Error Handling

### Credit Deduction Errors

1. **Insufficient Balance**: Log partial deduction, mark as unpaid
2. **Database Transaction Failure**: Rollback all changes, maintain data integrity
3. **Concurrent Deduction**: Use database locks to prevent double-deduction
4. **Invalid Class State**: Validate class is eligible for credit deduction

### Payment Reminder Errors

1. **Missing Parent Email**: Skip reminder, log warning
2. **Email Service Failure**: Queue for retry, notify teacher
3. **Invalid Student Data**: Skip reminder, log error for investigation

### Data Consistency Errors

1. **Orphaned Transactions**: Regular cleanup job to identify and resolve
2. **Balance Mismatches**: Reconciliation process to recalculate balances
3. **Missing Credit Accounts**: Auto-create accounts when needed

## Testing Strategy

### Unit Tests

1. **Credit Deduction Logic**
   - Test full deduction scenarios
   - Test partial deduction scenarios
   - Test zero balance scenarios
   - Test concurrent deduction prevention

2. **Pending Payment Calculation**
   - Test with various class/credit combinations
   - Test edge cases (negative balances, zero hours)
   - Test performance with large datasets

3. **Payment Status Display**
   - Test badge rendering for all status types
   - Test status transitions
   - Test UI responsiveness

### Integration Tests

1. **End-to-End Credit Flow**
   - Award credits → Log class → Auto-deduct → Verify balance
   - Test with multiple students and classes
   - Test error recovery scenarios

2. **Parent Dashboard Integration**
   - Test credit balance display accuracy
   - Test class history with payment status
   - Test data security (no cross-parent data leaks)

3. **Email Reminder System**
   - Test reminder generation
   - Test email delivery
   - Test reminder frequency limits

### Performance Tests

1. **Dashboard Load Times**
   - Test with 100+ students
   - Test with 1000+ class logs
   - Optimize database queries

2. **Credit Calculation Performance**
   - Test pending payment calculations
   - Test balance updates
   - Monitor database query performance

## Security Considerations

### Data Access Control

1. **Teacher Isolation**: Teachers can only access their own students' data
2. **Parent Isolation**: Parents can only access their own children's data
3. **Student Privacy**: Student data is only accessible to authorized teacher and parent

### Payment Data Security

1. **Credit Balance Protection**: Prevent unauthorized balance modifications
2. **Transaction Integrity**: Ensure all credit transactions are properly logged
3. **Audit Trail**: Maintain complete history of all credit-related actions

### API Security

1. **Authentication**: All endpoints require valid user authentication
2. **Authorization**: Role-based access control for all operations
3. **Input Validation**: Sanitize and validate all user inputs
4. **Rate Limiting**: Prevent abuse of credit and payment endpoints

## Migration Strategy

### Phase 1: Backend Integration (Week 1)
1. Add new fields to class_logs table
2. Implement credit deduction logic
3. Create pending payments calculation
4. Test with existing data

### Phase 2: Frontend Updates (Week 1)
1. Update Award Credits modal
2. Add payment status displays
3. Implement pending payments view
4. Add payment reminder functionality

### Phase 3: Parent Portal (Week 1)
1. Create parent credit balance view
2. Add class history with payment status
3. Test parent data isolation
4. Deploy and monitor

### Data Migration

1. **Existing Class Logs**: Backfill payment status based on existing credit transactions
2. **Credit Accounts**: Ensure all active students have credit accounts
3. **Rate Information**: Populate teacher rate data from existing profiles
4. **Transaction History**: Validate all existing credit transactions

## Monitoring and Maintenance

### Key Metrics

1. **Credit Balance Accuracy**: Monitor for discrepancies
2. **Payment Status Accuracy**: Verify status calculations
3. **Email Delivery Success**: Track reminder email success rates
4. **System Performance**: Monitor API response times

### Maintenance Tasks

1. **Daily**: Verify credit balance consistency
2. **Weekly**: Review failed payment reminders
3. **Monthly**: Reconcile payment records with credit transactions
4. **Quarterly**: Performance optimization review

### Alerting

1. **Credit Balance Errors**: Alert on negative balances or calculation errors
2. **Payment Processing Failures**: Alert on failed credit awards or deductions
3. **Email Service Issues**: Alert on high reminder failure rates
4. **Performance Degradation**: Alert on slow API responses