#!/usr/bin/env node

/**
 * Fix missing NextResponse imports in API routes
 */

const fs = require('fs');
const path = require('path');

function findApiRoutes(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item === 'route.ts') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function fixFile(filePath) {
  console.log(`🔧 Checking: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if file uses NextResponse
  const usesNextResponse = /NextResponse\.(json|redirect|next)/.test(content);
  
  if (!usesNextResponse) {
    console.log(`   ⏭️  No NextResponse usage found`);
    return false;
  }
  
  // Check if NextResponse is already imported
  const hasNextResponseImport = /import.*NextResponse.*from ['"]next\/server['"]/.test(content);
  
  if (hasNextResponseImport) {
    console.log(`   ✅ NextResponse already imported`);
    return false;
  }
  
  // Check if there's a NextRequest import we can extend
  const nextRequestImportMatch = content.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]next\/server['"]/);
  
  if (nextRequestImportMatch) {
    const imports = nextRequestImportMatch[1];
    if (!imports.includes('NextResponse')) {
      console.log(`   🔧 Adding NextResponse to existing import`);
      const newImports = imports.includes('NextRequest') 
        ? imports.replace('NextRequest', 'NextRequest, NextResponse')
        : imports + ', NextResponse';
      
      content = content.replace(
        nextRequestImportMatch[0],
        `import { ${newImports} } from 'next/server'`
      );
      modified = true;
    }
  } else {
    // Add new import at the top
    console.log(`   🔧 Adding new NextResponse import`);
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the right place to insert (after other imports)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, "import { NextResponse } from 'next/server'");
    content = lines.join('\n');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`   💾 Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🚀 Fixing missing NextResponse imports in API routes...\n');
  
  const apiDir = 'src/app/api';
  if (!fs.existsSync(apiDir)) {
    console.error('❌ API directory not found:', apiDir);
    process.exit(1);
  }
  
  const apiRoutes = findApiRoutes(apiDir);
  console.log(`📁 Found ${apiRoutes.length} API route files\n`);
  
  let fixedCount = 0;
  
  for (const routeFile of apiRoutes) {
    if (fixFile(routeFile)) {
      fixedCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Files fixed: ${fixedCount}`);
  console.log(`📁 Total files checked: ${apiRoutes.length}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 NextResponse import issues fixed!');
    console.log('🔄 Restart your development server to see the changes.');
  } else {
    console.log('\n✨ No issues found - all files have correct imports!');
  }
}

main();