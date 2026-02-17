#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // Fix unused parameters with underscore prefix
  {
    file: 'src/app/api/auth/me/route.ts',
    find: 'export async function GET(_request: Request)',
    replace: 'export async function GET()'
  },
  {
    file: 'src/app/api/booking/[token]/cancel/[booking_id]/route.ts',
    find: 'const { data: _booking, error: bookingError }',
    replace: 'const { error: bookingError }'
  },
  {
    file: 'src/app/api/booking/session/start/route.ts',
    find: 'let teacherInfo = null;',
    replace: 'const teacherInfo = null;'
  },
  {
    file: 'src/app/api/booking/session/start/route.ts',
    find: 'const { data: _booking, error: bookingError }',
    replace: 'const { error: bookingError }'
  },
  {
    file: 'src/app/api/privacy/settings/route.ts',
    find: 'export async function GET(\n  _request: Request,',
    replace: 'export async function GET('
  },
  {
    file: 'src/app/auth/callback/page.tsx',
    find: 'let timeoutId = setTimeout',
    replace: 'const timeoutId = setTimeout'
  },
  {
    file: 'src/app/auth/create-jwt/route.ts',
    find: 'export async function POST(_request: Request)',
    replace: 'export async function POST()'
  },
  {
    file: 'src/app/auth/signin/route.ts',
    find: 'export async function GET(_request: Request)',
    replace: 'export async function GET()'
  },
  {
    file: 'src/app/dashboard/teacher/layout.tsx',
    find: 'const isMainTeacherPage = pathname === \'/dashboard/teacher\';',
    replace: '// const isMainTeacherPage = pathname === \'/dashboard/teacher\';'
  },
  {
    file: 'src/lib/token-security.ts',
    find: 'reason: string = \'Token validation failed\'',
    replace: '_reason: string = \'Token validation failed\''
  },
  {
    file: 'src/lib/token-security.ts',
    find: 'const { data: tokenData, error: tokenError }',
    replace: 'const { error: tokenError }'
  },
  {
    file: 'src/lib/token-security.ts',
    find: 'const windowStart = now - RATE_LIMIT_WINDOW;',
    replace: '// const windowStart = now - RATE_LIMIT_WINDOW;'
  }
];

console.log('🔧 Fixing remaining lint errors...\n');

let fixedCount = 0;

fixes.forEach(({ file, find, replace }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(find)) {
      content = content.replace(find, replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n📊 Summary: ${fixedCount} files fixed`);
