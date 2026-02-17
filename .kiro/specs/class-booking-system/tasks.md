# Implementation Plan

- [x] 1. Extend database schema for booking system (additive only)
  - Create share_tokens table for student booking links (new table, no existing table modifications)
  - Create time_slots table for teacher availability management (new table, independent of existing schedule_slots)
  - Create bookings table for student class bookings (new table, references existing profiles)
  - Create blocked_slots table for teacher busy periods (new table)
  - Add database functions for booking transactions and recurring slots (new functions only)
  - Ensure all new tables use proper foreign key constraints to existing tables without modifying them
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 8.1, 8.2_

- [x] 2. Create core booking API endpoints
- [x] 2.1 Implement teacher time slot management API
  - Create POST /api/timeslots for creating availability slots
  - Create PUT /api/timeslots/[id] for updating slots
  - Create DELETE /api/timeslots/[id] for removing slots
  - Create POST /api/timeslots/bulk-create for recurring slots
  - Add validation for time conflicts and business rules
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Implement student booking portal API
  - Create GET /api/booking/[token]/calendar for privacy-filtered calendar view
  - Create POST /api/booking/[token]/book for slot booking
  - Create DELETE /api/booking/[token]/cancel/[booking_id] for cancellations
  - Create GET /api/booking/[token]/my-bookings for student booking history
  - Add share token validation and security measures
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 8.1, 8.2_

- [x] 2.3 Implement share token management API
  - Create POST /api/teacher/students/[id]/share-link for token generation
  - Create PUT /api/teacher/students/[id]/regenerate-token for token refresh
  - Create GET /api/teacher/analytics/token-usage for access tracking
  - Add token expiration and security policies
  - _Requirements: 2.2, 2.3, 8.1, 8.5_

- [x] 3. Build teacher schedule management interface
- [x] 3.1 Create TeacherScheduleView component
  - Build weekly calendar grid with time slots
  - Add slot creation modal with recurring options
  - Implement drag-and-drop slot management
  - Add bulk availability setting for multiple weeks
  - Display student bookings with color-coded themes
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

- [x] 3.2 Create AvailabilityModal component
  - Build time slot creation form with validation
  - Add recurring schedule options (2, 4, 8 weeks, custom)
  - Implement preview of slots to be created
  - Add conflict detection and resolution
  - _Requirements: 1.2, 1.3_

- [x] 3.3 Create StudentManagementPanel component
  - Build student list with booking link generation
  - Add color theme assignment interface
  - Implement booking link sharing options (copy, email)
  - Add student booking analytics and access logs
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Build student booking portal interface
- [x] 4.1 Create StudentBookingPortal component
  - Build privacy-filtered calendar view for students
  - Implement week navigation with available slots display
  - Add booking confirmation modal with policy display
  - Show upcoming classes list and booking history
  - Apply privacy filters to hide other student details
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 4.2 Create BookingConfirmationModal component
  - Build booking details display with date/time/teacher
  - Add cancellation policy information
  - Implement booking confirmation flow
  - Add success/error handling with user feedback
  - _Requirements: 3.4, 4.1_

- [x] 4.3 Create CancellationModal component
  - Build cancellation confirmation dialog
  - Add policy validation (24-hour rule, etc.)
  - Implement cancellation processing
  - Add teacher notification on cancellation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Integrate booking system with existing dashboard
- [x] 5.1 Add Schedule tab to TeacherDashboard (non-breaking)
  - Extend existing tabs to include "Schedule" option without modifying current tab functionality
  - Integrate TeacherScheduleView into dashboard layout as new tab content
  - Maintain consistent styling with existing components using same design system
  - Add navigation state management without affecting existing tab state
  - Ensure existing dashboard features remain fully functional
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5.2 Update navigation and routing
  - Add /book/[teacher]/[token] route for student portal
  - Update dashboard routing to handle schedule tab
  - Add proper error handling for invalid tokens
  - Implement responsive design for mobile booking
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 5.3 Integrate with existing student data (non-breaking)
  - Auto-populate student names from enrollment lists without modifying existing queries
  - Sync booking data with existing student profiles using additive approach
  - Extend StudentCard component to show booking status without breaking existing functionality
  - Add booking information to student detail modals as additional tabs/sections
  - Create backward compatibility layer for existing student data access
  - _Requirements: 5.5, 6.5_

- [x] 6. Implement notification system
- [x] 6.1 Create email notification service
  - Build booking confirmation email templates
  - Create cancellation notification templates
  - Add class reminder emails (24h, 1h before)
  - Implement teacher booking activity notifications
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 6.2 Add in-app notification system
  - Create notification component for real-time updates
  - Add booking status updates in teacher dashboard
  - Implement student portal notifications
  - Add notification preferences management
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 7. Connect with ClassLogger time tracking
- [x] 7.1 Implement booking-to-session integration
  - Create automatic session start for booked classes
  - Add booking ID to class log records
  - Sync completed bookings with time tracking data
  - Update student credit balances on class completion
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7.2 Create unified analytics dashboard
  - Combine booking data with existing class analytics
  - Add booking utilization metrics to teacher dashboard
  - Create student booking history in profiles
  - Implement booking vs. actual class correlation reports
  - _Requirements: 5.3, 5.6_

- [x] 8. Add security and privacy features
- [x] 8.1 Implement comprehensive token security
  - Add token expiration and rotation policies
  - Create rate limiting for booking endpoints
  - Add audit logging for all booking activities
  - Implement CSRF protection for booking forms
  - _Requirements: 8.1, 8.2, 8.5, 8.6_

- [x] 8.2 Add privacy protection measures
  - Implement data filtering for student portal views
  - Add GDPR compliance features for data export/deletion
  - Create privacy settings for teachers
  - Add secure token validation with timing attack protection
  - _Requirements: 8.1, 8.3, 8.4, 8.6_

- [-] 9. Create booking management utilities
- [x] 9.1 Build recurring slot management
  - Create bulk slot creation for weekly patterns
  - Add recurring slot modification and deletion
  - Implement exception handling for recurring series
  - Add preview and confirmation for bulk operations
  - _Requirements: 1.3, 1.4_

- [x] 9.2 Add booking conflict resolution
  - Create conflict detection for overlapping slots
  - Add automatic conflict resolution suggestions
  - Implement booking queue for popular time slots
  - Add waitlist functionality for fully booked slots
  - _Requirements: 1.5, 3.1_

- [ ] 10. Implement responsive design and accessibility
- [ ] 10.1 Create mobile-optimized booking interface
  - Build responsive calendar grid for mobile devices
  - Add touch-friendly booking interactions
  - Implement swipe navigation for week/month views
  - Create mobile-specific booking confirmation flow
  - _Requirements: 6.4_

- [ ] 10.2 Add accessibility compliance features
  - Implement keyboard navigation for calendar grid
  - Add ARIA labels and screen reader support
  - Ensure color contrast compliance for all themes
  - Create accessible booking confirmation dialogs
  - _Requirements: 8.4_

- [ ] 11. Add advanced booking features
- [ ] 11.1 Create booking analytics and reporting
  - Build teacher booking utilization reports
  - Add student booking pattern analysis
  - Create booking revenue tracking
  - Implement booking cancellation rate monitoring
  - _Requirements: 7.4, 7.5_

- [ ] 11.2 Add booking customization options
  - Create custom booking policies per teacher
  - Add flexible cancellation rules
  - Implement booking buffer times
  - Add custom booking confirmation messages
  - _Requirements: 4.3, 7.1_

- [ ] 12. High-risk area testing and existing system protection
- [ ] 12.1 Create targeted security and privacy tests
  - Write tests for share token validation and security
  - Add privacy filter tests to ensure student data isolation
  - Create booking conflict resolution tests
  - Test database transaction integrity for booking operations
  - _Requirements: 8.1, 8.2, 8.3, 3.1, 3.2_

- [ ]* 12.2 Create comprehensive component unit tests
  - Write unit tests for all booking components
  - Add component interaction tests
  - Create form validation tests
  - Test error handling and edge cases
  - _Requirements: All requirements_

- [ ] 12.3 Add existing system protection measures
  - Create regression tests for existing dashboard functionality
  - Add integration tests to ensure booking system doesn't break current features
  - Test existing API endpoints remain unaffected
  - Verify existing student/teacher workflows continue working
  - _Requirements: 6.3, 6.4, 6.5_

- [ ] 12.4 Performance optimization and monitoring
  - Optimize database queries for calendar views
  - Add caching for frequently accessed booking data
  - Implement monitoring for booking system performance
  - Add error tracking and alerting for booking failures
  - _Requirements: All requirements_