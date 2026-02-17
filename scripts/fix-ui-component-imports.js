#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix unused React imports in UI components
const uiComponentsPath = path.join(process.cwd(), 'src/components/ui');
const files = fs.readdirSync(uiComponentsPath).filter(f => f.endsWith('.tsx'));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(uiComponentsPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove unused forwardRef, createElement, useContext, etc. from React imports
  const unusedImports = [
    'forwardRef',
    'createContext',
    'useContext',
    'useEffect',
    'useState',
    'useId',
    'useMemo',
    'useCallback'
  ];

  unusedImports.forEach(importName => {
    // Check if the import is used in the file
    const importRegex = new RegExp(`\\b${importName}\\b`, 'g');
    const matches = content.match(importRegex);
    
    // If it appears only once (in the import statement), it's unused
    if (matches && matches.length === 1) {
      // Remove from import statement
      content = content.replace(new RegExp(`,\\s*${importName}`, 'g'), '');
      content = content.replace(new RegExp(`${importName},\\s*`, 'g'), '');
      content = content.replace(new RegExp(`{\\s*${importName}\\s*}`, 'g'), '{}');
      modified = true;
    }
  });

  // Clean up empty React imports
  content = content.replace(/import\s+{\s*}\s+from\s+['"]react['"]/g, "import * as React from 'react'");
  content = content.replace(/import\s+React,\s*{\s*}\s+from\s+['"]react['"]/g, "import * as React from 'react'");

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  }
});

console.log(`\n📊 Summary: ${fixedCount} UI components fixed`);
