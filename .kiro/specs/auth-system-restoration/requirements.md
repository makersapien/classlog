# Authentication System Restoration Requirements

## Introduction

The authentication system was working correctly before the booking system implementation. During the booking system development, authentication components were unnecessarily modified, causing login failures and build errors. This spec aims to restore the authentication system to its previous working state while keeping the booking system functionality isolated.

## Requirements

### Requirement 1: Restore Original Authentication Components

**User Story:** As a teacher or parent, I want to be able to log in using Google OAuth just like before the booking system was implemented, so that I can access my dashboard without errors.

#### Acceptance Criteria

1. WHEN a user visits the login page THEN the system SHALL use the original working Supabase client from `src/lib/supabase.ts`
2. WHEN a user clicks "Sign in with Google" THEN the system SHALL initiate OAuth flow using the original `signInWithGoogle` function
3. WHEN OAuth callback is processed THEN the system SHALL use the original callback handler without dynamic imports
4. WHEN a user is redirected to dashboard THEN the system SHALL load the dashboard without `ssr: false` dynamic import errors

### Requirement 2: Fix Teacher Dashboard Loading

**User Story:** As a teacher, I want my dashboard to load immediately without dynamic import errors, so that I can access my teaching tools.

#### Acceptance Criteria

1. WHEN a teacher accesses `/dashboard/teacher` THEN the system SHALL load the dashboard as a regular server component
2. WHEN the dashboard loads THEN the system SHALL NOT use `next/dynamic` with `ssr: false` in server components
3. WHEN the dashboard renders THEN the system SHALL use the standard Supabase client for authentication checks

### Requirement 3: Isolate Booking System Components

**User Story:** As a developer, I want the booking system to be completely separate from authentication, so that booking features don't interfere with login functionality.

#### Acceptance Criteria

1. WHEN booking components need Supabase access THEN they SHALL use the standard `src/lib/supabase.ts` client
2. WHEN booking APIs are called THEN they SHALL NOT affect authentication state or components
3. WHEN authentication components are loaded THEN they SHALL NOT import any booking-specific modules

### Requirement 4: Remove Problematic Dynamic Imports

**User Story:** As a developer, I want to eliminate the `supabase-dynamic.ts` pattern that was causing build errors, so that the application builds and runs reliably.

#### Acceptance Criteria

1. WHEN the application builds THEN the system SHALL NOT use `src/lib/supabase-dynamic.ts`
2. WHEN components need Supabase access THEN they SHALL import from `src/lib/supabase.ts` directly
3. WHEN authentication flows execute THEN they SHALL use synchronous Supabase client imports

### Requirement 5: Preserve Booking System Functionality

**User Story:** As a teacher, I want the booking system features to continue working after authentication is restored, so that I don't lose the new functionality.

#### Acceptance Criteria

1. WHEN booking system components are accessed THEN they SHALL continue to function with the standard Supabase client
2. WHEN booking APIs are called THEN they SHALL continue to work without authentication interference
3. WHEN booking database operations execute THEN they SHALL use the existing booking tables and functions