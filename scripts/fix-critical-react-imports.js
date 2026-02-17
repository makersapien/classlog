#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Critical files that are causing runtime errors
const criticalFiles = [
  'src/app/auth/extension-callback/page.tsx',
  'src/app/dashboard/DashboardLayout.tsx',
  'src/app/dashboard/TeacherDashboard.tsx',
  'src/app/dashboard/UnifiedDashboard.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/teacher/booking/page.tsx',
  'src/app/dashboard/teacher/layout.tsx',
  'src/app/dashboard/teacher/students/page.tsx',
  'src/components/AvailabilityModal.tsx',
  'src/components/AwardCreditsModal.tsx',
  'src/components/InteractiveCalendarView.tsx',
  'src/components/PendingPaymentsView.tsx',
  'src/components/ScheduleSlots.tsx',
  'src/components/StreamlinedScheduleView.tsx',
  'src/components/StudentBookingPortal.tsx',
  'src/contexts/DashboardLayoutContext.tsx',
  'src/hooks/use-mobile.ts',
  'src/hooks/use-toast.ts',
  'src/hooks/useClassLogs.ts'
];

function fixReactImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Find existing React import line
    const lines = content.split('\n');
    let reactImportLineIndex = -1;
    let existingImports = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("import") && line.includes("react") && !line.includes("@")) {
        reactImportLineIndex = i;
        // Extract existing imports
        const match = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*\{([^}]+)\})?\s+from\s+['"]react['"]/);
        if (match) {
          if (match[1]) existingImports.push(...match[1].split(',').map(s => s.trim()));
          if (match[2]) existingImports.push(...match[2].split(',').map(s => s.trim()));
        }
        break;
      }
    }

    // Check what React features are used
    const usedFeatures = [];
    const reactFeatures = [
      'useEffect', 'useState', 'useCallback', 'useMemo', 'useRef', 
      'useContext', 'useReducer', 'useLayoutEffect', 'Suspense',
      'Fragment', 'createContext', 'forwardRef', 'memo'
    ];

    reactFeatures.forEach(feature => {
      const regex = new RegExp(`\\b${feature}\\b`, 'g');
      if (content.match(regex) && !existingImports.includes(feature)) {
        // Check if it's actually used (not in comments)
        const realUsage = lines.some(line => 
          line.includes(feature) && 
          !line.trim().startsWith('//') && 
          !line.trim().startsWith('*') &&
          !line.includes(`'${feature}'`) &&
          !line.includes(`"${feature}"`)
        );
        if (realUsage) {
          usedFeatures.push(feature);
        }
      }
    });

    if (usedFeatures.length === 0) {
      return false;
    }

    // Combine existing and new imports
    const allImports = [...new Set([...existingImports, ...usedFeatures])].sort();

    // Create new import line
    const newImportLine = `import { ${allImports.join(', ')} } from 'react'`;

    if (reactImportLineIndex >= 0) {
      // Replace existing import
      lines[reactImportLineIndex] = newImportLine;
      hasChanges = true;
    } else {
      // Add new import at the top (after 'use client' if present)
      let insertIndex = 0;
      if (lines[0] && lines[0].includes("'use client'")) {
        insertIndex = 1;
        if (lines[1] === '') insertIndex = 2; // Skip empty line after 'use client'
      }
      lines.splice(insertIndex, 0, newImportLine);
      hasChanges = true;
    }

    if (hasChanges) {
      newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed imports in ${filePath}`);
      console.log(`   Added: ${usedFeatures.join(', ')}`);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('🔧 Fixing critical React import issues...\n');

let fixedCount = 0;

criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fixReactImports(fullPath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with React import issues.`);

if (fixedCount > 0) {
  console.log('\n🔄 Please restart your development server to see the changes.');
}