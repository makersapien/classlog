#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix UI components - remove unused React imports
const uiPath = 'src/components/ui';
const uiFiles = fs.readdirSync(uiPath).filter(f => f.endsWith('.tsx'));

let fixedCount = 0;

uiFiles.forEach(file => {
  const filePath = path.join(uiPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace specific unused imports
  const replacements = [
    { from: "import React, { forwardRef } from 'react'", to: "import * as React from 'react'" },
    { from: "import React, { createContext, forwardRef } from 'react'", to: "import * as React from 'react'" },
    { from: "import React, { createContext, forwardRef, useContext } from 'react'", to: "import * as React from 'react'" },
    { from: ", forwardRef", to: "" },
    { from: ", createContext", to: "" },
    { from: ", useContext", to: "" },
    { from: ", useCallback", to: "" },
    { from: ", useEffect", to: "" },
    { from: ", useState", to: "" },
    { from: ", useId", to: "" },
    { from: ", useMemo", to: "" }
  ];

  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
});

// Fix other specific files
const otherFixes = [
  { file: 'src/components/StudentManagementPanel.tsx', from: 'CardHeader,', to: '' },
  { file: 'src/components/StudentManagementPanel.tsx', from: 'Input,', to: '' },
  { file: 'src/components/StudentManagementPanel.tsx', from: 'onStudentUpdate,', to: '' },
  { file: 'src/components/StudentAssignmentModal.tsx', from: 'Badge,', to: '' },
  { file: 'src/components/StreamlinedScheduleView.tsx', from: 'user,', to: '' },
  { file: 'src/components/ConflictResolutionModal.tsx', from: 'proposedSlots,', to: '' },
  { file: 'src/components/InteractiveCalendarView.tsx', from: 'onStudentAssignment,', to: '' },
  { file: 'src/lib/cors.ts', from: '_request: Request', to: '' },
  { file: 'src/app/api/teacher/students/[id]/regenerate-token/route.ts', from: "import { middleware }", to: "// import { middleware }" },
  { file: 'src/app/api/teacher/students/[id]/share-link/route.ts', from: "import { middleware }", to: "// import { middleware }" }
];

otherFixes.forEach(({ file, from, to }) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(from)) {
      content = content.replace(from, to);
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
    }
  }
});

console.log(`✅ Fixed ${fixedCount} files`);
