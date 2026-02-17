#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
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
  'src/app/api/booking/[token]/cancel/[booking_id]/route.ts': [
    { from: 'const { data: _booking, error: bookingError }', to: 'const { error: bookingError }' }
  ],
  'src/app/api/booking/session/start/route.ts': [
    { from: 'let teacherInfo = null;', to: 'const teacherInfo = null;' },
    { from: 'const { data: _booking, error: bookingError }', to: 'const { error: bookingError }' }
  ],
  'src/app/auth/callback/page.tsx': [
    { from: 'let timeoutId = setTimeout', to: 'const timeoutId = setTimeout' }
  ],
  'src/app/dashboard/teacher/layout.tsx': [
    { from: "const isMainTeacherPage = pathname === '/dashboard/teacher';", to: "// const isMainTeacherPage = pathname === '/dashboard/teacher';" }
  ],
  'src/lib/token-security.ts': [
    { from: "reason: string = 'Token validation failed'", to: "_reason: string = 'Token validation failed'" },
    { from: 'const { data: tokenData, error: tokenError }', to: 'const { error: tokenError }' },
    { from: 'const windowStart = now - RATE_LIMIT_WINDOW;', to: '// const windowStart = now - RATE_LIMIT_WINDOW;' }
  ],
  'src/app/book/[teacher]/[token]/page.tsx': [
    { from: 'params,', to: '' }
  ],
  'src/app/dashboard/teacher/payments/PaymentCreditsPage.tsx': [
    { from: 'ImageIcon,', to: '' }
  ],
  'src/components/AvailabilityModal.tsx': [
    { from: 'Checkbox,', to: '' },
    { from: 'teacherId,', to: '' }
  ],
  'src/components/ConflictResolutionModal.tsx': [
    { from: 'useEffect,', to: '' },
    { from: 'CheckCircle,', to: '' },
    { from: 'proposedSlots,', to: '' },
    { from: 'const getConflictTypeLabel = ', to: '// const getConflictTypeLabel = ' },
    { from: 'const conflictKey = ', to: '// const conflictKey = ' }
  ],
  'src/components/NotificationPreferences.tsx': [
    { from: 'Calendar,', to: '' }
  ],
  'src/components/PrivacySettingsModal.tsx': [
    { from: 'createElement,', to: '' },
    { from: 'Textarea,', to: '' },
    { from: 'Eye,', to: '' }
  ],
  'src/components/RecurringSlotModal.tsx': [
    { from: 'CheckCircle,', to: '' },
    { from: 'Clock,', to: '' }
  ],
  'src/components/SlotCreationModal.tsx': [
    { from: "import { useState } from 'react'", to: "import React from 'react'" }
  ],
  'src/components/StreamlinedScheduleView.tsx': [
    { from: 'Card,', to: '' },
    { from: 'CardContent,', to: '' },
    { from: 'CardHeader,', to: '' },
    { from: 'Calendar,', to: '' },
    { from: 'user,', to: '' }
  ],
  'src/components/StudentAssignmentModal.tsx': [
    { from: 'Badge,', to: '' }
  ],
  'src/components/StudentCard.tsx': [
    { from: 'useToast,', to: '' }
  ],
  'src/components/StudentManagementPanel.tsx': [
    { from: 'CardHeader,', to: '' },
    { from: 'Input,', to: '' },
    { from: 'Calendar,', to: '' },
    { from: 'Clock,', to: '' },
    { from: 'teacherId,', to: '' },
    { from: 'onStudentUpdate,', to: '' }
  ],
  'src/lib/email-service.ts': [
    { from: 'const booking = ', to: '// const booking = ' }
  ]
};

console.log('🔧 Fixing all ESLint issues...\n');

let fixedCount = 0;
let errorCount = 0;

Object.entries(fixes).forEach(([file, replacements]) => {
  const filePath = path.join(process.cwd(), file);
  
  try {
    if (fixFile(filePath, replacements)) {
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary: ${fixedCount} files fixed, ${errorCount} errors`);
