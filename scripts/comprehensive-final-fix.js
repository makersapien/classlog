#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fix(file, replacements) {
  const filePath = path.join(process.cwd(), file);
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

const allFixes = {
  'src/app/api/booking/[token]/my-bookings/route.ts': [
    { from: 'error: _upcomingError', to: 'error: upcomingError' }
  ],
  'src/app/api/booking/analytics/route.ts': [
    { from: 'let teacherInfo = null;', to: 'const teacherInfo = null;' },
    { from: 'error: _upcomingError', to: 'error: upcomingError' },
    { from: 'error: _classesError', to: 'error: classesError' }
  ],
  'src/app/api/booking/session/start/route.ts': [
    { from: 'let teacherInfo = null;', to: 'const teacherInfo = null;' }
  ],
  'src/app/api/privacy/settings/route.ts': [
    { from: '_request: Request,', to: '' }
  ],
  'src/app/api/teacher/students/[id]/regenerate-token/route.ts': [
    { from: "const crypto = require('crypto')", to: "import crypto from 'crypto'" }
  ],
  'src/app/api/teacher/students/[id]/share-link/route.ts': [
    { from: "const crypto = require('crypto')", to: "import crypto from 'crypto'" }
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
    { from: 'const pathname = usePathname();', to: '// const pathname = usePathname();' }
  ],
  'src/components/AvailabilityModal.tsx': [
    { from: '&quot;', to: '"' }
  ],
  'src/components/ConflictResolutionModal.tsx': [
    { from: 'proposedSlots,', to: '' },
    { from: '(conflict, index)', to: '(conflict)' },
    { from: '&quot;', to: '"' }
  ],
  'src/components/SlotCreationModal.tsx': [
    { from: '&quot;', to: '"' }
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
  'src/lib/token-security.ts': [
    { from: 'reason: string', to: '_reason: string' },
    { from: 'const { data: tokenData, error: tokenError }', to: 'const { error: tokenError }' },
    { from: 'const windowStart = now - RATE_LIMIT_WINDOW;', to: '// const windowStart = now - RATE_LIMIT_WINDOW;' }
  ]
};

let fixedCount = 0;

Object.entries(allFixes).forEach(([file, replacements]) => {
  if (fix(file, replacements)) {
    console.log(`✅ ${file}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
