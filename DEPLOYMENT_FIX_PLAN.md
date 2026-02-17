# Deployment Fix Plan for Vercel

## 🎯 **Objective**
Fix all ESLint errors and runtime issues for successful Vercel deployment while maintaining functionality.

## 🔍 **Issues Identified**

### 1. **Authentication System Mismatch**
- **Problem**: `supabase-server.ts` looks for `classlogger_auth` cookie but uses Supabase auth
- **Solution**: Fix authentication to use proper Supabase session management

### 2. **Duplicate Booking Systems**
- **Active System**: `/api/schedule-slots/` (uses `schedule_slots` table)
- **Legacy System**: `/api/timeslots/` (uses `time_slots` table) - **TO BE REMOVED**

### 3. **ESLint Errors (100+ errors)**
- Unused variables and imports
- TypeScript `any` types
- Forbidden `require()` imports
- React hook dependency warnings

### 4. **Missing Database Functions**
- `validate_share_token_secure` - may not exist
- `book_slot_with_validation` - may not exist

## 🛠 **Fix Strategy**

### Phase 1: Clean Up Unused Files
1. Remove entire `/api/timeslots/` directory
2. Remove unused test files and duplicate components
3. Remove `.bak` files and unused migrations

### Phase 2: Fix Authentication System
1. Update `supabase-server.ts` to use proper Supabase auth
2. Fix all API endpoints to use consistent auth
3. Test authentication flow

### Phase 3: Fix ESLint Errors Systematically
1. Fix unused variables by removing or prefixing with `_`
2. Replace `any` types with proper TypeScript types
3. Convert `require()` to `import` statements
4. Fix React hook dependencies

### Phase 4: Database Schema Verification
1. Check if required RPC functions exist
2. Create missing functions if needed
3. Verify table relationships

### Phase 5: Test and Deploy
1. Run comprehensive tests
2. Verify build passes
3. Deploy to Vercel

## 📋 **Execution Plan**

### Step 1: Remove Legacy Booking System
- Delete `/api/timeslots/` directory
- Remove related components and tests
- Update any references to use `schedule-slots`

### Step 2: Fix Authentication
- Rewrite `supabase-server.ts` to use Supabase auth properly
- Update all API endpoints to use new auth system

### Step 3: Systematic ESLint Fixes
- Create automated script to fix common issues
- Manually fix complex cases
- Ensure all files pass linting

### Step 4: Database Functions
- Check and create missing RPC functions
- Verify all database operations work

## 🎯 **Success Criteria**
- ✅ `npm run build` passes without errors
- ✅ All API endpoints return proper responses (not 500 errors)
- ✅ Student and parent flows work correctly
- ✅ No ESLint errors
- ✅ Successful Vercel deployment

## 📊 **Current Status**
- 🔴 Build: FAILING (ESLint errors)
- 🔴 Runtime: FAILING (500 errors on most APIs)
- 🔴 Tests: FAILING (authentication issues)

## 🎯 **Target Status**
- 🟢 Build: PASSING
- 🟢 Runtime: PASSING
- 🟢 Tests: PASSING
- 🟢 Deployment: SUCCESSFUL