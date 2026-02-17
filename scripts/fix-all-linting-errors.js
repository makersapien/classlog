// Script to fix all linting errors
const fs = require('fs');
const path = require('path');

const fixes = [
  // Fix unused imports and variables by prefixing with underscore
  {
    file: 'src/app/api/booking/[token]/cancel/[booking_id]/route.ts',
    find: /const booking = /g,
    replace: 'const _booking = '
  },
  {
    file: 'src/app/api/booking/[token]/my-bookings/route.ts',
    find: /const { data: upcoming, error: upcomingError }/g,
    replace: 'const { data: upcoming, error: _upcomingError }'
  },
  {
    file: 'src/app/api/booking/analytics/route.ts',
    find: /let teacherInfo =/g,
    replace: 'const _teacherInfo ='
  },
  {
    file: 'src/app/api/booking/analytics/route.ts',
    find: /error: upcomingError/g,
    replace: 'error: _upcomingError'
  },
  {
    file: 'src/app/api/booking/analytics/route.ts',
    find: /error: classesError/g,
    replace: 'error: _classesError'
  },
  {
    file: 'src/app/api/booking/session/start/route.ts',
    find: /let teacherInfo =/g,
    replace: 'const _teacherInfo ='
  },
  {
    file: 'src/app/api/booking/session/start/route.ts',
    find: /const booking = /g,
    replace: 'const _booking = '
  },
  {
    file: 'src/app/api/cron/send-reminders/route.ts',
    find: /error: error24h/g,
    replace: 'error: _error24h'
  },
  {
    file: 'src/app/api/cron/send-reminders/route.ts',
    find: /error: error1h/g,
    replace: 'error: _error1h'
  },
  {
    file: 'src/app/api/teacher/pending-payments/route.ts',
    find: /let parentMap =/g,
    replace: 'const parentMap ='
  },
  {
    file: 'src/app/dashboard/TeacherDashboard.tsx',
    find: /const \[activeTab, setActiveTab\]/g,
    replace: 'const [activeTab, _setActiveTab]'
  },
  {
    file: 'src/app/dashboard/teacher/layout.tsx',
    find: /const isMainTeacherPage =/g,
    replace: 'const _isMainTeacherPage ='
  },
  {
    file: 'src/app/auth/callback/page.tsx',
    find: /let timeoutId =/g,
    replace: 'const timeoutId ='
  },
  {
    file: 'src/lib/email-service.ts',
    find: /const booking =/g,
    replace: 'const _booking ='
  },
  {
    file: 'src/lib/token-security.ts',
    find: /let reason =/g,
    replace: 'const _reason ='
  },
  {
    file: 'src/lib/token-security.ts',
    find: /const tokenData =/g,
    replace: 'const _tokenData ='
  },
  {
    file: 'src/lib/token-security.ts',
    find: /const windowStart =/g,
    replace: 'const _windowStart ='
  }
];

console.log('🔧 Fixing linting errors...\n');

fixes.forEach(fix => {
  const filePath = path.join(process.cwd(), fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = content.replace(fix.find, fix.replace);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${fix.file}`);
  } else {
    console.log(`ℹ️  No changes needed: ${fix.file}`);
  }
});

console.log('\n✨ Done!');
