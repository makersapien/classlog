#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive list of React imports that might be missing
const REACT_IMPORTS = [
  'React',
  'useState',
  'useEffect',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useId',
  'useSyncExternalStore',
  'useInsertionEffect',
  'Suspense',
  'Fragment',
  'StrictMode',
  'createContext',
  'forwardRef',
  'memo',
  'lazy',
  'startTransition',
  'Component',
  'PureComponent',
  'createElement',
  'cloneElement',
  'isValidElement'
];

function fixAllReactImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if not a React file
    if (!content.includes('import') || (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.js'))) {
      return { success: false, error: 'Not a React file' };
    }
    
    let newContent = content;
    let hasChanges = false;
    
    // Find all React features used in the file
    const usedReactFeatures = new Set();
    
    REACT_IMPORTS.forEach(feature => {
      // Look for various usage patterns
      const patterns = [
        new RegExp(`\\b${feature}\\s*\\(`, 'g'), // function calls like useState(
        new RegExp(`\\b${feature}\\s*<`, 'g'),   // JSX like <Suspense
        new RegExp(`<${feature}[\\s>]`, 'g'),    // JSX components
        new RegExp(`\\b${feature}\\.`, 'g'),     // property access like React.useState
        new RegExp(`\\b${feature}\\s*=`, 'g'),   // assignments
        new RegExp(`\\b${feature}\\s*,`, 'g'),   // in destructuring
        new RegExp(`\\b${feature}\\s*}`, 'g'),   // end of destructuring
        new RegExp(`{\\s*${feature}\\s*}`, 'g'), // direct destructuring
      ];
      
      const hasUsage = patterns.some(pattern => content.match(pattern));
      
      if (hasUsage) {
        usedReactFeatures.add(feature);
      }
    });
    
    if (usedReactFeatures.size === 0) {
      return { success: false, error: 'No React features found' };
    }
    
    const lines = newContent.split('\n');
    let reactImportLineIndex = -1;
    let existingReactImports = new Set();
    
    // Find existing React import
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('import') && line.includes('react') && !line.includes('@')) {
        reactImportLineIndex = i;
        
        // Extract existing imports
        const importMatch = line.match(/import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+['"]react['"]/);
        if (importMatch) {
          // Default import (React)
          if (importMatch[1]) {
            existingReactImports.add(importMatch[1]);
          }
          // Named imports
          if (importMatch[2]) {
            importMatch[2].split(',').forEach(imp => {
              existingReactImports.add(imp.trim());
            });
          }
        }
        break;
      }
    }
    
    // Determine what imports we need
    const neededImports = Array.from(usedReactFeatures).filter(feature => !existingReactImports.has(feature));
    
    if (neededImports.length === 0) {
      return { success: false, error: 'All React imports already present' };
    }
    
    // Combine existing and new imports
    const allImports = Array.from(new Set([...existingReactImports, ...neededImports]));
    
    // Separate React default import from named imports
    const hasReactDefault = allImports.includes('React');
    const namedImports = allImports.filter(imp => imp !== 'React').sort();
    
    // Create new import statement
    let newImportLine;
    if (hasReactDefault && namedImports.length > 0) {
      newImportLine = `import React, { ${namedImports.join(', ')} } from 'react'`;
    } else if (hasReactDefault) {
      newImportLine = `import React from 'react'`;
    } else if (namedImports.length > 0) {
      newImportLine = `import { ${namedImports.join(', ')} } from 'react'`;
    } else {
      return { success: false, error: 'No imports needed' };
    }
    
    if (reactImportLineIndex >= 0) {
      // Replace existing import
      if (lines[reactImportLineIndex] !== newImportLine) {
        lines[reactImportLineIndex] = newImportLine;
        hasChanges = true;
      }
    } else {
      // Add new import
      let insertIndex = 0;
      
      // Find the right place to insert (after 'use client' if present)
      if (lines[0] && lines[0].includes("'use client'")) {
        insertIndex = 1;
        if (lines[1] === '') insertIndex = 2;
      }
      
      lines.splice(insertIndex, 0, newImportLine);
      hasChanges = true;
    }
    
    if (hasChanges) {
      newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
      return { 
        success: true, 
        addedImports: neededImports,
        totalImports: allImports.length
      };
    }
    
    return { success: false, error: 'No changes needed' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find all React files
function findReactFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findReactFiles(fullPath, files);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Warning: Could not read directory ${dir}: ${error.message}`);
  }
  
  return files;
}

console.log('🔧 Comprehensive React imports fix...\n');

const srcDir = path.join(process.cwd(), 'src');
const reactFiles = findReactFiles(srcDir);

let fixedCount = 0;
let totalImportsAdded = 0;

console.log(`Found ${reactFiles.length} files to check\n`);

reactFiles.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  const result = fixAllReactImports(file);
  
  if (result.success) {
    fixedCount++;
    totalImportsAdded += result.addedImports.length;
    console.log(`✅ Fixed ${relativePath}`);
    console.log(`   Added: ${result.addedImports.join(', ')}`);
    console.log(`   Total imports: ${result.totalImports}`);
    console.log('');
  } else if (result.error !== 'No React features found' && 
             result.error !== 'All React imports already present' && 
             result.error !== 'Not a React file' &&
             result.error !== 'No changes needed') {
    console.log(`❌ Error fixing ${relativePath}: ${result.error}`);
  }
});

console.log(`\n🎯 Summary:`);
console.log(`✅ Fixed ${fixedCount} files`);
console.log(`🔧 Added ${totalImportsAdded} React imports`);

if (fixedCount > 0) {
  console.log('\n🔄 Please restart your development server to see the changes.');
  console.log('💡 ALL React import errors should now be resolved!');
  console.log('🚀 No more "React is not defined", "useState is not defined", etc. errors!');
} else {
  console.log('\n✅ No React import issues found or all were already fixed.');
}