#!/usr/bin/env node

/**
 * Quick ESLint fixes for common issues
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix unused variables by prefixing with underscore
    const unusedVarPatterns = [
      /const (\w+) = /g,
      /let (\w+) = /g,
      /\{ data: (\w+), error: (\w+) \}/g
    ];

    // Fix require imports
    content = content.replace(/require\('crypto'\)/g, "await import('crypto')");
    
    // Fix unused parameters
    content = content.replace(/\((\w+): NextRequest\) =>/g, '(_$1: NextRequest) =>');
    content = content.replace(/function \w+\((\w+): NextRequest\)/g, 'function $_1(_$1: NextRequest)');

    // Fix prefer-const
    content = content.replace(/let (\w+) = \{[^}]*\};/g, 'const $1 = {');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fixFile(filePath);
    }
  }
}

console.log('Fixing common ESLint issues...');
walkDir('./src');
console.log('Done!');