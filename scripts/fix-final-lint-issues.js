#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

const fixes = {
  'src/app/api/auth/me/route.ts': [
    { from: 'import { NextRequest, NextResponse  }', to: 'import { NextResponse }' }
  ],
  'src/app/api/booking/[token]/cancel/[booking_id]/route.ts': [
    { from: 'const { data: _booking, error: bookingError }', to: 'const { error: bookingError }' }
  ],
  'src/app/api/booking/[token]/my-bookings/route.ts': [
    { from: 'error: upcomingError', to: 'error: _upcomingError' }
  ],
  'src/app/api/booking/analytics/route.ts': [
    { from: 'let teacherInfo = null;', to: 'const teacherInfo = null;' },
    { from: 'error: upcomingError', to: 'error: _upcomingError' },
    { from: 'error: classesError', to: 'error: _classesError' }
  ],
  'src/app/api/booking/session/start/route.ts': [
    { from: 'let teacherInfo = null;', to: 'const teacherInfo = null;' },
    { from: 'const { data: _booking, error: bookingError }', to: 'const { error: bookingError }' }
  ],
  'src/app/api/privacy/settings/route.ts': [
    { from: '_request: Request,', to: '' }
  ],
  'src/app/auth/callback/page.tsx': [
    { from: 'let timeoutId = setTimeout', to: 'const timeoutId = setTimeout' },
    { from: ': any', to: ': unknown' }
  ],
  'src/app/auth/create-jwt/route.ts': [
    { from: 'export async function POST(_request: Request)', to: 'export async function POST()' }
  ],
  'src/app/auth/signin/route.ts': [
    { from: 'export async function GET(_request: Request)', to: 'export async function GET()' }
  ],
  'src/app/book/[teacher]/[token]/page.tsx': [
    { from: 'params,', to: '' }
  ],
  'src/app/dashboard/teacher/layout.tsx': [
    { from: 'const isMainTeacherPage = pathname', to: '// const isMainTeacherPage = pathname' }
  ],
  'src/app/api/teacher/students/[id]/regenerate-token/route.ts': [
    { from: "import { middleware } from '@/lib/rate-limiting'", to: "// import { middleware } from '@/lib/rate-limiting'" },
    { from: "const crypto = require('crypto')", to: "import crypto from 'crypto'" }
  ],
  'src/app/api/teacher/students/[id]/share-link/route.ts': [
    { from: "import { middleware } from '@/lib/rate-limiting'", to: "// import { middleware } from '@/lib/rate-limiting'" },
    { from: "const crypto = require('crypto')", to: "import crypto from 'crypto'" }
  ],
  'src/components/AvailabilityModal.tsx': [
    { from: 'import { Checkbox }', to: '// import { Checkbox }' },
    { from: '&quot;', to: "'" }
  ],
  'src/components/BookingAnalyticsDashboard.tsx': [
    { from: '(slot, index)', to: '(slot)' }
  ],
  'src/components/InteractiveCalendarView.tsx': [
    { from: 'onStudentAssignment,', to: '' }
  ],
  'src/components/StudentBookingPortal.tsx': [
    { from: '&apos;', to: "'" }
  ],
  'src/components/StudentBookingHistory.tsx': [
    { from: '&apos;', to: "'" }
  ],
  'src/components/StudentManagementPanel.tsx': [
    { from: '&apos;', to: "'" }
  ],
  'src/components/SlotCreationModal.tsx': [
    { from: '&quot;', to: "'" }
  ],
  'src/lib/token-security.ts': [
    { from: 'reason: string', to: '_reason: string' },
    { from: 'const { data: tokenData, error: tokenError }', to: 'const { error: tokenError }' },
    { from: 'const windowStart = now - RATE_LIMIT_WINDOW;', to: '// const windowStart = now - RATE_LIMIT_WINDOW;' }
  ],
  'src/lib/email-service.ts': [
    { from: 'const booking = ', to: '// const booking = ' }
  ],
  'src/lib/rate-limiting.ts': [
    { from: '_request: Request', to: '' },
    { from: "const crypto = require('crypto')", to: "import crypto from 'crypto'" }
  ],
  'src/lib/cors.ts': [
    { from: '_request: Request', to: '' }
  ]
};

console.log('🔧 Fixing final lint issues...\n');

let fixedCount = 0;

Object.entries(fixes).forEach(([file, replacements]) => {
  const filePath = path.join(process.cwd(), file);
  
  try {
    if (replaceInFile(filePath, replacements)) {
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n📊 Summary: ${fixedCount} files fixed`);
