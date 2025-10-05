# Build Errors Task List

## 🎯 Current Status: 3 Remaining Issues

### ✅ COMPLETED FIXES:
- Fixed duplicate `user` variable declarations in payments and schedule-slots routes
- Fixed TypeScript `any` types in dashboard, debug, extension routes
- Fixed unescaped apostrophes in TeacherDashboard
- Fixed CORS headers type issues
- Fixed unused imports and variables
- Fixed `authError` references in credits and teacher/students routes
- Fixed property name mismatch (`google_meet_link` → `google_meet_url`)

### 🔧 REMAINING TASKS:

#### 1. **CRITICAL ERROR** - Fix `Request.json()` in teacher/students route
**File:** `src/app/api/teacher/students/route.ts:506:32`
**Error:** `Property 'json' does not exist on type 'Request'`
**Fix:** Change `Request.json()` to `request.json()`
**Priority:** HIGH (Blocking build)

#### 2. **WARNING** - Replace `<img>` with Next.js `<Image>` component
**File:** `src/app/dashboard/teacher/payments/PaymentCreditsPage.tsx:484:25`
**Error:** `Using <img> could result in slower LCP and higher bandwidth`
**Fix:** Import and use `next/image` Image component
**Priority:** MEDIUM (Performance warning)

#### 3. **WARNING** - Move custom fonts to proper location
**File:** `src/app/layout.tsx:22:9`
**Error:** `Custom fonts not added in pages/_document.js will only load for a single page`
**Fix:** Move font loading to proper Next.js location or suppress warning
**Priority:** LOW (Performance warning)

## 🚀 EXECUTION PLAN:

### Task 1: Fix Request.json() Error (CRITICAL)
```typescript
// BEFORE (Line 506):
const body = await Request.json()

// AFTER:
const body = await request.json()
```

### Task 2: Fix Image Component Warning
```typescript
// BEFORE:
<img src="..." alt="..." />

// AFTER:
import Image from 'next/image'
<Image src="..." alt="..." width={...} height={...} />
```

### Task 3: Fix Font Loading Warning
Options:
- Move fonts to `_document.js` (if using pages router)
- Add `// eslint-disable-next-line @next/next/no-page-custom-font` comment
- Use Next.js font optimization

## 📊 Progress Tracker:
- ✅ TypeScript Errors: 8/8 Fixed
- 🔧 Critical Errors: 0/1 Fixed  
- ⚠️ Warnings: 0/2 Fixed
- **Total Progress: 89% Complete**

## 🎯 Next Steps:
1. Fix the `Request.json()` error (5 minutes)
2. Replace `<img>` with `<Image>` (10 minutes)  
3. Handle font loading warning (5 minutes)
4. Run final build test
5. Deploy to production! 🚀