#!/usr/bin/env node

/**
 * Fix specific syntax errors caused by the automated script
 */

const fs = require('fs');
const path = require('path');

function fixSyntaxErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix double function declarations
    const doubleFunctionPattern = /export async function function (\w+)\([^)]*\)\([^)]*\)/g;
    if (doubleFunctionPattern.test(content)) {
      content = content.replace(doubleFunctionPattern, 'export async function $1(_request: NextRequest)');
      modified = true;
    }

    // Fix regular function function patterns
    const functionFunctionPattern = /function function (\w+)\([^)]*\)\([^)]*\)/g;
    if (functionFunctionPattern.test(content)) {
      content = content.replace(functionFunctionPattern, 'function $1(_request: NextRequest)');
      modified = true;
    }

    // Fix export function function patterns
    const exportFunctionFunctionPattern = /export function function (\w+)\([^)]*\)\([^)]*\)/g;
    if (exportFunctionFunctionPattern.test(content)) {
      content = content.replace(exportFunctionFunctionPattern, 'export function $1(_request: NextRequest)');
      modified = true;
    }

    // Fix triple function patterns
    const tripleFunctionPattern = /export async function function function (\w+)\([^)]*\)\([^)]*\)\([^)]*\)/g;
    if (tripleFunctionPattern.test(content)) {
      content = content.replace(tripleFunctionPattern, 'export async function $1(_request: NextRequest)');
      modified = true;
    }

    // Fix double variable declarations
    const doubleVarPattern = /const (\w+) = let \1 = (.+)/g;
    if (doubleVarPattern.test(content)) {
      content = content.replace(doubleVarPattern, 'let $1 = $2');
      modified = true;
    }

    // Fix double for loop declarations
    const doubleForPattern = /for \(const (\w+) = let \1 = (.+?); (.+?); (.+?)\)/g;
    if (doubleForPattern.test(content)) {
      content = content.replace(doubleForPattern, 'for (let $1 = $2; $3; $4)');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed syntax errors in: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (fixSyntaxErrors(filePath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('🔧 Fixing syntax errors...');
const fixedCount = walkDir('./src');
console.log(`✅ Fixed syntax errors in ${fixedCount} files`);