#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  { file: 'src/lib/email-service.ts', from: 'const booking =', to: '// const booking =' },
  { file: 'src/lib/rate-limiting.ts', from: '_request: Request', to: '' },
  { file: 'src/lib/token-security.ts', from: 'reason: string', to: '_reason: string' },
  { file: 'src/lib/token-security.ts', from: 'const { data: tokenData,', to: 'const {' },
  { file: 'src/lib/token-security.ts', from: 'const windowStart =', to: '// const windowStart =' },
  { file: 'src/components/StudentBookingPortal.tsx', from: "&apos;", to: "'" },
  { file: 'src/components/StudentManagementPanel.tsx', from: "&apos;", to: "'" },
  { file: 'src/components/StudentBookingHistory.tsx', from: "&apos;", to: "'" },
  { file: 'src/components/AvailabilityModal.tsx', from: "&quot;", to: '"' },
  { file: 'src/components/ConflictResolutionModal.tsx', from: "&quot;", to: '"' },
  { file: 'src/components/SlotCreationModal.tsx', from: "&quot;", to: '"' }
];

let fixedCount = 0;

fixes.forEach(({ file, from, to }) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
    }
  }
});

// Fix notification-service.ts - replace remaining any types
const notifPath = path.join(process.cwd(), 'src/lib/notification-service.ts');
if (fs.existsSync(notifPath)) {
  let content = fs.readFileSync(notifPath, 'utf8');
  // Replace specific any types with Record<string, unknown>
  content = content.replace(/: any\[\]/g, ': Record<string, unknown>[]');
  content = content.replace(/: any\)/g, ': Record<string, unknown>)');
  fs.writeFileSync(notifPath, content, 'utf8');
  fixedCount++;
}

console.log(`✅ Fixed ${fixedCount} files`);
