#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ from, to }) => {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (regex.test(content)) {
      content = content.replace(regex, to);
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
  'src/app/api/schedule-slots/bulk-create/route.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/app/api/schedule-slots/bulk-delete/route.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/app/api/schedule-slots/bulk-update/route.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/components/ConflictResolutionModal.tsx': [
    { from: ': any', to: ': unknown' }
  ],
  'src/components/RecurringSlotModal.tsx': [
    { from: ': any', to: ': unknown' }
  ],
  'src/components/StreamlinedScheduleView.tsx': [
    { from: ': any', to: ': unknown' }
  ],
  'src/components/WaitlistModal.tsx': [
    { from: ': any', to: ': unknown' }
  ],
  'src/lib/notification-service.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/lib/privacy-protection.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/lib/rate-limiting.ts': [
    { from: ': any', to: ': unknown' }
  ],
  'src/types/database.ts': [
    { from: ': any', to: ': unknown' }
  ]
};

console.log('🔧 Fixing "any" types...\n');

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
