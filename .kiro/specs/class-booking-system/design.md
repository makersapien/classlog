# Design Document

## Overview

The Class Booking System is a comprehensive scheduling solution that integrates seamlessly with the existing ClassLogger application. It enables teachers to manage their availability through time slots and allows students to book classes via personalized shareable links. The system maintains privacy-first principles where students only see their own bookings and available slots, while teachers have full visibility of their calendar.

The design leverages the existing ClassLogger architecture, including the Supabase database, Next.js API routes, React components with Tailwind CSS styling, and the established authentication system. The booking system will be accessible through a new "Schedule" navigation item in the main app sidebar.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ClassLogger Frontend                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Dashboard     │  │   Students      │  │   Schedule      │  │
│  │   (Existing)    │  │   (Existing)    │  │   (New)         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Next.js API Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   /api/booking  │  │ /api/timeslots  │  │ /api/schedule   │  │
│  │   (Student)     │  │ (Teacher CRUD)  │  │ (Management)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Supabase Database                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   time_slots    │  │    bookings     │  │  share_tokens   │  │
│  │   (Teacher)     │  │   (Student)     │  │   (Security)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Authentication**: Uses existing ClassLogger JWT authentication system
2. **Student Management**: Integrates with existing student records and profiles
3. **Navigation**: Adds "Schedule" tab to existing dashboard navigation
4. **Styling**: Follows existing Tailwind CSS design system and color schemes
5. **Time Tracking**: Connects booked classes to ClassLogger time tracking functionality

## Components and Interfaces

### Core Components

#### 1. TeacherScheduleView Component
```typescript
interface TeacherScheduleViewProps {
  teacherId: string
  user: UserProfile
}

// Features:
// - Weekly calendar grid view
// - Time slot management (create/edit/delete)
// - Student booking overview
// - Availability management
// - Recurring slot creation
```

#### 2. StudentBookingPortal Component
```typescript
interface StudentBookingPortalProps {
  shareToken: string
  teacherUsername: string
}

// Features:
// - Privacy-filtered calendar view
// - Booking confirmation flow
// - Cancellation management
// - Upcoming classes list
```

#### 3. CalendarGrid Component
```typescript
interface CalendarGridProps {
  slots: TimeSlot[]
  viewMode: 'week' | 'month'
  userRole: 'teacher' | 'student'
  onSlotClick: (slot: TimeSlot) => void
  privacyFilter?: boolean
}

// Features:
// - Responsive grid layout
// - Color-coded slot states
// - Interactive slot management
// - Privacy filtering for students
```

#### 4. BookingModal Component
```typescript
interface BookingModalProps {
  slot: TimeSlot
  student: StudentProfile
  onConfirm: (booking: BookingData) => void
  onCancel: () => void
}

// Features:
// - Booking confirmation dialog
// - Cancellation policy display
// - Email notification options
```

### Navigation Integration

The booking system integrates into the existing dashboard navigation structure:

```typescript
// Updated TeacherDashboard.tsx tabs
<Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid grid-cols-3 md:grid-cols-3 lg:w-[400px]">
    <TabsTrigger value="students">Students</TabsTrigger>
    <TabsTrigger value="schedule">Schedule</TabsTrigger>  {/* New */}
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  
  <TabsContent value="schedule">
    <TeacherScheduleView teacherId={user.id} user={user} />
  </TabsContent>
</Tabs>
```

## Data Models

### Database Schema Extensions

#### 1. Time Slots Table
```sql
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  day_of_week VARCHAR(10) NOT NULL, -- 'Monday', 'Tuesday', etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  booking_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  booked_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Share Tokens Table
```sql
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  token VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

#### 4. Blocked Slots Table
```sql
CREATE TABLE blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  day_of_week VARCHAR(10),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  date DATE, -- for one-time blocks
  is_recurring BOOLEAN DEFAULT false,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Data Models

#### TimeSlot Interface
```typescript
interface TimeSlot {
  id: string
  teacher_id: string
  day_of_week: string
  start_time: string
  end_time: string
  is_available: boolean
  is_recurring: boolean
  recurrence_end_date?: string
  booking?: BookingInfo
  created_at: string
  updated_at: string
}
```

#### Booking Interface
```typescript
interface Booking {
  id: string
  teacher_id: string
  student_id: string
  time_slot_id: string
  booking_date: string
  status: 'confirmed' | 'cancelled' | 'completed'
  booked_at: string
  cancelled_at?: string
  notes?: string
  student_info?: StudentProfile
  teacher_info?: TeacherProfile
}
```

#### ShareToken Interface
```typescript
interface ShareToken {
  id: string
  student_id: string
  teacher_id: string
  token: string
  is_active: boolean
  access_count: number
  last_accessed?: string
  created_at: string
  expires_at?: string
}
```

## Error Handling

### API Error Responses

#### Standard Error Format
```typescript
interface APIError {
  error: string
  code?: string
  details?: string
  timestamp: string
  path: string
}
```

#### Common Error Scenarios

1. **Invalid Share Token**
   - Status: 401 Unauthorized
   - Response: `{ error: "Invalid or expired booking link", code: "INVALID_TOKEN" }`

2. **Slot Already Booked**
   - Status: 409 Conflict
   - Response: `{ error: "This time slot is no longer available", code: "SLOT_UNAVAILABLE" }`

3. **Cancellation Policy Violation**
   - Status: 400 Bad Request
   - Response: `{ error: "Cannot cancel within 24 hours of class time", code: "CANCELLATION_POLICY_VIOLATION" }`

4. **Insufficient Permissions**
   - Status: 403 Forbidden
   - Response: `{ error: "You don't have permission to access this resource", code: "INSUFFICIENT_PERMISSIONS" }`

### Frontend Error Handling

```typescript
// Error boundary for booking components
class BookingErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Booking system error:', error, errorInfo)
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return <BookingErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

## Testing Strategy

### Unit Testing

#### Component Tests
```typescript
// Example test for BookingModal component
describe('BookingModal', () => {
  it('should display booking confirmation details', () => {
    const mockSlot = {
      id: '1',
      start_time: '14:00',
      end_time: '15:00',
      date: '2025-10-20'
    }
    
    render(<BookingModal slot={mockSlot} onConfirm={jest.fn()} />)
    
    expect(screen.getByText('Monday, October 20, 2025')).toBeInTheDocument()
    expect(screen.getByText('2:00 PM - 3:00 PM')).toBeInTheDocument()
  })

  it('should call onConfirm when booking is confirmed', () => {
    const mockOnConfirm = jest.fn()
    const mockSlot = { /* slot data */ }
    
    render(<BookingModal slot={mockSlot} onConfirm={mockOnConfirm} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
    expect(mockOnConfirm).toHaveBeenCalledWith(expect.objectContaining({
      slot_id: mockSlot.id
    }))
  })
})
```

#### API Route Tests
```typescript
// Example test for booking API
describe('/api/booking/[token]/book', () => {
  it('should create a booking for valid token and available slot', async () => {
    const mockToken = 'valid-token-123'
    const mockSlotId = 'slot-456'
    
    const response = await request(app)
      .post(`/api/booking/${mockToken}/book`)
      .send({ slot_id: mockSlotId })
      .expect(200)
    
    expect(response.body).toMatchObject({
      success: true,
      booking: expect.objectContaining({
        id: expect.any(String),
        status: 'confirmed'
      })
    })
  })

  it('should return 409 for already booked slot', async () => {
    // Test implementation
  })
})
```

### Integration Testing

#### End-to-End Booking Flow
```typescript
describe('Student Booking Flow', () => {
  it('should allow student to book an available slot', async () => {
    // 1. Teacher creates availability
    await createTimeSlot({
      teacher_id: 'teacher-1',
      day_of_week: 'Monday',
      start_time: '14:00',
      end_time: '15:00'
    })
    
    // 2. Student accesses booking portal
    const shareToken = await generateShareToken('student-1', 'teacher-1')
    await page.goto(`/book/teacher-username/${shareToken}`)
    
    // 3. Student sees available slot
    await expect(page.locator('[data-testid="available-slot"]')).toBeVisible()
    
    // 4. Student books the slot
    await page.click('[data-testid="book-slot-btn"]')
    await page.click('[data-testid="confirm-booking-btn"]')
    
    // 5. Verify booking was created
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
    
    // 6. Verify teacher sees the booking
    await loginAsTeacher()
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="booked-slot"]')).toBeVisible()
  })
})
```

### Privacy Testing

#### Student Portal Privacy Tests
```typescript
describe('Student Portal Privacy', () => {
  it('should only show student their own bookings', async () => {
    // Create bookings for multiple students
    await createBooking('student-1', 'slot-1')
    await createBooking('student-2', 'slot-2')
    
    // Student 1 accesses their portal
    const token1 = await getShareToken('student-1')
    const response = await request(app)
      .get(`/api/booking/${token1}/calendar`)
      .expect(200)
    
    // Should only see their own booking and available slots
    const bookings = response.body.bookings
    expect(bookings.filter(b => b.student_id === 'student-1')).toHaveLength(1)
    expect(bookings.filter(b => b.student_id === 'student-2')).toHaveLength(0)
    
    // Other student bookings should appear as "BOOKED" without details
    const slots = response.body.slots
    const otherStudentSlots = slots.filter(s => s.status === 'booked' && s.student_id !== 'student-1')
    otherStudentSlots.forEach(slot => {
      expect(slot.student_name).toBeUndefined()
      expect(slot.student_details).toBeUndefined()
    })
  })
})
```

## Security Considerations

### Share Token Security

#### Token Generation
```typescript
// Cryptographically secure token generation
import crypto from 'crypto'

function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex') // 64 character hex string
}

// Token validation with timing attack protection
function validateToken(providedToken: string, storedToken: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(providedToken, 'hex'),
    Buffer.from(storedToken, 'hex')
  )
}
```

#### Token Management
- Tokens expire after 1 year by default
- Teachers can regenerate tokens to revoke access
- Access logging for audit trails
- Rate limiting on token-based endpoints

### Row Level Security (RLS) Policies

#### Time Slots Access
```sql
-- Teachers can manage their own slots
CREATE POLICY time_slots_teacher_policy ON time_slots
  FOR ALL USING (auth.uid() = teacher_id);

-- Students can view available slots and their bookings
CREATE POLICY time_slots_student_view ON time_slots
  FOR SELECT USING (
    is_available = true OR 
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.time_slot_id = time_slots.id 
      AND bookings.student_id = auth.uid()
    )
  );
```

#### Bookings Access
```sql
-- Students can only see their own bookings
CREATE POLICY bookings_student_policy ON bookings
  FOR ALL USING (auth.uid() = student_id);

-- Teachers can see bookings for their slots
CREATE POLICY bookings_teacher_policy ON bookings
  FOR SELECT USING (auth.uid() = teacher_id);
```

### API Security

#### Rate Limiting
```typescript
// Rate limiting configuration
const rateLimits = {
  booking: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 bookings per 15 minutes
  calendar: { windowMs: 60 * 1000, max: 60 }, // 60 calendar requests per minute
  token_access: { windowMs: 60 * 1000, max: 100 } // 100 token validations per minute
}
```

#### Input Validation
```typescript
// Zod schemas for API validation
const BookingRequestSchema = z.object({
  slot_id: z.string().uuid(),
  notes: z.string().max(500).optional()
})

const TimeSlotSchema = z.object({
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  is_recurring: z.boolean().default(false)
})
```

## Performance Optimization

### Database Optimization

#### Indexing Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_time_slots_teacher_day ON time_slots(teacher_id, day_of_week);
CREATE INDEX idx_bookings_student_date ON bookings(student_id, booking_date);
CREATE INDEX idx_bookings_teacher_status ON bookings(teacher_id, status);
CREATE INDEX idx_share_tokens_active ON share_tokens(token, is_active) WHERE is_active = true;
```

#### Query Optimization
```typescript
// Efficient calendar data fetching
async function getCalendarData(teacherId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  // Single query to get all relevant data
  const { data } = await supabase
    .from('time_slots')
    .select(`
      *,
      bookings!inner(
        id,
        student_id,
        booking_date,
        status,
        profiles(name, grade, subject)
      )
    `)
    .eq('teacher_id', teacherId)
    .gte('bookings.booking_date', weekStart.toISOString().split('T')[0])
    .lte('bookings.booking_date', weekEnd.toISOString().split('T')[0])
  
  return data
}
```

### Frontend Optimization

#### Component Memoization
```typescript
// Memoized calendar grid for performance
const CalendarGrid = React.memo(({ slots, onSlotClick }) => {
  const memoizedSlots = useMemo(() => {
    return slots.map(slot => ({
      ...slot,
      displayTime: formatTime(slot.start_time, slot.end_time),
      statusColor: getStatusColor(slot.status)
    }))
  }, [slots])
  
  return (
    <div className="calendar-grid">
      {memoizedSlots.map(slot => (
        <CalendarCell key={slot.id} slot={slot} onClick={onSlotClick} />
      ))}
    </div>
  )
})
```

#### Data Caching
```typescript
// React Query configuration for booking data
const useCalendarData = (teacherId: string, weekStart: Date) => {
  return useQuery({
    queryKey: ['calendar', teacherId, weekStart.toISOString()],
    queryFn: () => fetchCalendarData(teacherId, weekStart),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  })
}
```

## Accessibility Compliance

### WCAG 2.1 AA Standards

#### Keyboard Navigation
```typescript
// Keyboard accessible calendar navigation
const CalendarCell = ({ slot, onClick }) => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(slot)
    }
  }
  
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${slot.status} time slot from ${slot.start_time} to ${slot.end_time}`}
      onKeyPress={handleKeyPress}
      onClick={() => onClick(slot)}
      className="calendar-cell focus:ring-2 focus:ring-indigo-500"
    >
      {/* Cell content */}
    </div>
  )
}
```

#### Screen Reader Support
```typescript
// ARIA labels and descriptions
<div
  role="grid"
  aria-label="Weekly class schedule"
  aria-describedby="calendar-instructions"
>
  <div id="calendar-instructions" className="sr-only">
    Use arrow keys to navigate between time slots. Press Enter to book or manage a slot.
  </div>
  
  {slots.map(slot => (
    <div
      key={slot.id}
      role="gridcell"
      aria-label={`${formatDate(slot.date)} ${slot.start_time} to ${slot.end_time}, ${slot.status}`}
      aria-describedby={slot.booking ? `booking-${slot.booking.id}` : undefined}
    >
      {/* Slot content */}
    </div>
  ))}
</div>
```

#### Color Contrast and Visual Design
- All text maintains minimum 4.5:1 contrast ratio
- Interactive elements have 3:1 contrast ratio
- Focus indicators are clearly visible
- Color is not the only means of conveying information

## Integration with ClassLogger

### Time Tracking Integration

#### Automatic Session Start
```typescript
// When a booked class begins, automatically start time tracking
async function handleClassStart(bookingId: string) {
  const booking = await getBooking(bookingId)
  
  // Check if ClassLogger extension is active
  const extensionActive = await checkExtensionStatus()
  
  if (extensionActive) {
    // Send message to extension to start tracking
    await sendMessageToExtension({
      type: 'START_CLASS_TRACKING',
      data: {
        studentId: booking.student_id,
        subject: booking.subject,
        bookingId: booking.id
      }
    })
  }
  
  // Update booking status
  await updateBooking(bookingId, { status: 'in_progress' })
}
```

#### Session Completion
```typescript
// When class ends, mark booking as completed and sync data
async function handleClassEnd(bookingId: string, sessionData: ClassSession) {
  await updateBooking(bookingId, { 
    status: 'completed',
    actual_duration: sessionData.duration,
    notes: sessionData.notes
  })
  
  // Deduct credit from student account
  await deductCredit(booking.student_id, 1)
  
  // Update analytics
  await updateTeacherAnalytics(booking.teacher_id, sessionData)
}
```

### Student Data Synchronization

#### Auto-populate Student Information
```typescript
// When creating booking links, use existing student data
async function generateBookingLink(teacherId: string, studentId: string) {
  const student = await getStudentProfile(studentId)
  
  const shareToken = await createShareToken({
    student_id: studentId,
    teacher_id: teacherId,
    token: generateSecureToken(),
    student_name: student.name,
    student_grade: student.grade,
    student_subject: student.subject
  })
  
  return `${process.env.NEXT_PUBLIC_BASE_URL}/book/${teacherId}/${shareToken.token}`
}
```

This design document provides a comprehensive blueprint for implementing the class booking system while maintaining seamless integration with the existing ClassLogger application. The architecture leverages existing components and patterns while introducing new functionality that enhances the overall user experience for both teachers and students.