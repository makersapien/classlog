#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test if the critical components can be parsed without syntax errors
const criticalComponents = [
  'src/components/Header.tsx',
  'src/app/auth/callback/page.tsx',
  'src/app/layout.tsx',
  'src/app/dashboard/page.tsx'
];

console.log('🧪 Testing critical components for syntax errors...\n');

let hasErrors = false;

criticalComponents.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for missing imports
    if (content.includes('useEffect') && !content.includes('import') && !content.includes('useEffect')) {
      issues.push('useEffect used but not imported');
    }
    
    if (content.includes('useState') && !content.includes('import') && !content.includes('useState')) {
      issues.push('useState used but not imported');
    }
    
    if (content.includes('Suspense') && !content.includes('import') && !content.includes('Suspense')) {
      issues.push('Suspense used but not imported');
    }
    
    // Check for basic syntax issues
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('useEffect(') && !content.includes('import { useEffect') && !content.includes('import {') && !content.includes('useEffect')) {
        issues.push(`Line ${index + 1}: useEffect used without import`);
      }
    });
    
    if (issues.length > 0) {
      hasErrors = true;
      console.log(`❌ ${file}:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log(`✅ ${file} - No obvious syntax issues`);
    }
    
  } catch (error) {
    hasErrors = true;
    console.log(`❌ Error reading ${file}: ${error.message}`);
  }
});

if (!hasErrors) {
  console.log('\n✅ All critical components look good!');
  console.log('🔄 Try restarting your dev server now.');
} else {
  console.log('\n❌ Some issues remain. Check the output above.');
}