#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // Remove unused imports and variables
  {
    file: 'src/app/api/auth/me/route.ts',
    replacements: [
      { from: /export async function GET\(_request: Request\)/, to: 'export async function GET()' }
    ]
  },
  {
    file: 'src/app/api/booking/[token]/cancel/[booking_id]/route.ts',
    replacements: [
      { from: /const \{ data: _booking, error: bookingError \}/, to: 'const { error: bookingError }' }
    ]
  },
  {
    file: 'src/app/api/booking/[token]/my-bookings/route.ts',
    replacements: [
      { from: /error: _upcomingError/, to: 'error: upcomingError' }
    ]
  },
  {
    file: 'src/app/api/booking/analytics/route.ts',
    replacements: [
      { from: /let teacherInfo = null;/, to: 'const teacherInfo = null;' },
      { from: /error: _upcomingError/, to: 'error: upcomingError' },
      { from: /error: _classesError/, to: 'error: classesError' }
    ]
  },
  {
    file: 'src/app/api/booking/session/start/route.ts',
    replacements: [
      { from: /let teacherInfo = null;/, to: 'const teacherInfo = null;' },
      { from: /const \{ data: _booking, error: bookingError \}/, to: 'const { error: bookingError }' }
    ]
  },
  {
    file: 'src/app/api/cron/send-reminders/route.ts',
    replacements: [
      { from: /error: _error24h/, to: 'error: error24h' },
      { from: /error: _error1h/, to: 'error: error1h' }
    ]
  },
  {
    file: 'src/app/api/privacy/settings/route.ts',
    replacements: [
      { from: /export async function GET\(\s*_request: Request,/, to: 'export async function GET(' }
    ]
  },
  {
    file: 'src/app/api/teacher/pending-payments/route.ts',
    replacements: [
      { from: /let parentMap = new Map/, to: 'const parentMap = new Map' }
    ]
  },
  {
    file: 'src/app/auth/callback/page.tsx',
    replacements: [
      { from: /let timeoutId = setTimeout/, to: 'const timeoutId = setTimeout' }
    ]
  },
  {
    file: 'src/app/auth/create-jwt/route.ts',
    replacements: [
      { from: /export async function POST\(_request: Request\)/, to: 'export async function POST()' }
    ]
  },
  {
    file: 'src/app/auth/signin/route.ts',
    replacements: [
      { from: /export async function GET\(_request: Request\)/, to: 'export async function GET()' }
    ]
  },
  {
    file: 'src/app/dashboard/TeacherDashboard.tsx',
    replacements: [
      { from: /const \[activeTab, setActiveTab\] = useState/, to: 'const [activeTab] = useState' }
    ]
  },
  {
    file: 'src/app/dashboard/teacher/layout.tsx',
    replacements: [
      { from: /const isMainTeacherPage = pathname === '\/dashboard\/teacher';/, to: '// const isMainTeacherPage = pathname === \'/dashboard/teacher\';' }
    ]
  },
  {
    file: 'src/lib/token-security.ts',
    replacements: [
      { from: /reason: string = 'Token validation failed'/, to: '_reason: string = \'Token validation failed\'' },
      { from: /const \{ data: tokenData, error: tokenError \}/, to: 'const { error: tokenError }' },
      { from: /const windowStart = now - RATE_LIMIT_WINDOW;/, to: '// const windowStart = now - RATE_LIMIT_WINDOW;' }
    ]
  }
];

console.log('🔧 Fixing lint errors...\n');

let fixedCount = 0;
let errorCount = 0;

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    errorCount++;
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary: ${fixedCount} files fixed, ${errorCount} errors`);
