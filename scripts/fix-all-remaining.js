#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // Remove unused variables by prefixing with underscore
  { file: 'src/app/api/booking/[token]/cancel/[booking_id]/route.ts', from: 'data: _booking,', to: '' },
  { file: 'src/app/api/booking/session/start/route.ts', from: 'data: _booking,', to: '' },
  { file: 'src/app/api/privacy/settings/route.ts', from: '_request: Request,', to: '' },
  { file: 'src/app/dashboard/teacher/layout.tsx', from: 'const pathname = usePathname();', to: '// const pathname = usePathname();' },
  { file: 'src/components/ConflictResolutionModal.tsx', from: 'import React, { useState, useEffect }', to: 'import React, { useState }' },
  { file: 'src/components/ConflictResolutionModal.tsx', from: 'proposedSlots,', to: '' },
  { file: 'src/components/ConflictResolutionModal.tsx', from: '(conflict, index)', to: '(conflict)' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onStudentAssignment,', to: '' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onMouseDown={(slotId)', to: 'onMouseDown={()' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onMouseEnter={(slotId)', to: 'onMouseEnter={()' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onRightClick={(slotId)', to: 'onRightClick={()' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onClick={(slotId)', to: 'onClick={()' },
  { file: 'src/components/StreamlinedScheduleView.tsx', from: 'const error =', to: '// const error =' },
  { file: 'src/components/NotificationPreferences.tsx', from: 'import { Bell, Mail, MessageSquare, Calendar }', to: 'import { Bell, Mail, MessageSquare }' },
  { file: 'src/app/book/[teacher]/[token]/page.tsx', from: 'params,', to: '' }
];

console.log('🔧 Fixing all remaining issues...\n');

let fixedCount = 0;

fixes.forEach(({ file, from, to }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(from)) {
      content = content.replace(from, to);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n📊 Summary: ${fixedCount} files fixed`);
