# Interactive Calendar Booking System Design

## Overview

The Interactive Calendar Booking System enhances the existing booking management with drag-and-drop time slot creation, visual status indicators, and direct student assignment capabilities. The system builds upon the existing TeacherScheduleView component and booking infrastructure.

## Architecture

### Component Structure
```
InteractiveCalendarView
├── CalendarGrid (7 days × time slots)
├── TimeSlotCell (individual 15-min slots)
├── StudentAssignmentModal
├── SlotSelectionHandler
└── ConfirmationNotificationSystem
```

### Data Flow
1. **Teacher Interaction** → SlotSelectionHandler → API calls → Database updates
2. **Student Assignment** → StudentAssignmentModal → Reservation creation → Notification
3. **Student Confirmation** → Confirmation API → Booking creation/slot release

## Components and Interfaces

### 1. InteractiveCalendarView Component

**Props:**
```typescript
interface InteractiveCalendarViewProps {
  teacherId: string
  currentWeek: Date
  onSlotUpdate: (slots: TimeSlot[]) => void
  onStudentAssignment: (slotIds: string[], studentId: string) => void
}
```

**State Management:**
```typescript
interface CalendarState {
  timeSlots: TimeSlot[]
  selectedSlots: string[]
  isDragging: boolean
  dragStartSlot: string | null
  assignmentMode: boolean
  students: Student[]
}
```

### 2. TimeSlotCell Component

**Visual States:**
- **Unavailable**: `bg-gray-200 text-gray-400` (default)
- **Available**: `bg-green-100 border-green-300 text-green-800`
- **Assigned**: `bg-blue-100 border-blue-300 text-blue-800` + student name
- **Selecting**: `bg-yellow-100 border-yellow-400` (during drag)
- **Hover**: `hover:bg-gray-100` (on unavailable slots)

**Event Handlers:**
```typescript
interface TimeSlotCellProps {
  slot: TimeSlot
  isSelected: boolean
  onMouseDown: (slotId: string) => void
  onMouseEnter: (slotId: string) => void
  onMouseUp: () => void
  onRightClick: (slotId: string) => void
}
```

### 3. SlotSelectionHandler

**Drag Selection Logic:**
```typescript
class SlotSelectionHandler {
  private startSlot: string | null = null
  private selectedSlots: Set<string> = new Set()
  
  handleMouseDown(slotId: string): void
  handleMouseMove(slotId: string): void
  handleMouseUp(): void
  validateSelection(slots: string[]): ValidationResult
}
```

**Selection Validation:**
- Check if slots are already assigned
- Ensure slots are in valid time order
- Prevent selection of past time slots

### 4. StudentAssignmentModal

**Interface:**
```typescript
interface StudentAssignmentModalProps {
  isOpen: boolean
  selectedSlots: TimeSlot[]
  students: Student[]
  onAssign: (studentId: string) => void
  onCancel: () => void
}
```

**Features:**
- Student search/filter
- Slot summary display
- Assignment confirmation
- Conflict detection

## Data Models

### Enhanced TimeSlot Model
```typescript
interface TimeSlot {
  id: string
  teacherId: string
  startTime: Date
  endTime: Date
  status: 'unavailable' | 'available' | 'assigned' | 'booked'
  assignedStudentId?: string
  assignedStudentName?: string
  assignmentExpiry?: Date
  createdAt: Date
  updatedAt: Date
}
```

### SlotAssignment Model
```typescript
interface SlotAssignment {
  id: string
  slotIds: string[]
  teacherId: string
  studentId: string
  status: 'pending' | 'confirmed' | 'declined' | 'expired'
  assignedAt: Date
  expiresAt: Date
  confirmedAt?: Date
}
```

## API Endpoints

### 1. Bulk Slot Creation
```typescript
POST /api/timeslots/bulk-create
{
  teacherId: string
  slots: {
    startTime: string
    endTime: string
  }[]
}
```

### 2. Student Assignment
```typescript
POST /api/timeslots/assign-student
{
  slotIds: string[]
  studentId: string
  teacherId: string
}
```

### 3. Student Confirmation
```typescript
POST /api/timeslots/confirm-assignment
{
  assignmentId: string
  action: 'confirm' | 'decline'
}
```

### 4. Slot Status Update
```typescript
PATCH /api/timeslots/bulk-update
{
  slotIds: string[]
  status: 'available' | 'unavailable'
}
```

## Error Handling

### Client-Side Validation
```typescript
interface ValidationError {
  type: 'SLOTS_ALREADY_ASSIGNED' | 'INVALID_TIME_RANGE' | 'STUDENT_CONFLICT'
  message: string
  affectedSlots: string[]
}
```

### Error Messages
- **Assigned Slots**: "Cannot modify slots already assigned to [Student Name]"
- **Invalid Selection**: "Please select valid time slots"
- **Assignment Conflict**: "Student already has booking during this time"
- **Network Error**: "Failed to update slots. Please try again."

## Testing Strategy

### Unit Tests
- SlotSelectionHandler drag logic
- TimeSlotCell state transitions
- Validation functions
- API endpoint handlers

### Integration Tests
- Complete drag-to-create workflow
- Student assignment flow
- Confirmation/decline workflow
- Error handling scenarios

### E2E Tests
- Teacher creates availability by dragging
- Teacher assigns slots to student
- Student confirms/declines assignment
- Conflict resolution scenarios

## Performance Considerations

### Optimization Strategies
1. **Debounced API Calls**: Batch slot updates during drag operations
2. **Virtual Scrolling**: For large time ranges (full month view)
3. **Memoized Components**: Prevent unnecessary re-renders
4. **Optimistic Updates**: Immediate UI feedback before API confirmation

### Caching Strategy
- Cache student list for assignment modal
- Cache current week's slots
- Invalidate cache on slot updates

## Security Considerations

### Authorization
- Verify teacher owns slots being modified
- Validate student assignment permissions
- Prevent unauthorized slot access

### Data Validation
- Sanitize time slot inputs
- Validate date ranges
- Check for malicious drag patterns

## Migration Strategy

### Database Changes
1. Add `assigned_student_id` and `assignment_expiry` to timeslots table
2. Create `slot_assignments` table for tracking pending assignments
3. Add indexes for performance optimization

### Component Integration
1. Enhance existing TeacherScheduleView with interactive features
2. Maintain backward compatibility with current booking system
3. Gradual rollout with feature flags