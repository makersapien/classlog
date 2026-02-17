#!/usr/bin/env node

/**
 * Fix _request parameter naming issues in API routes
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
  
  // Pattern to match function declarations with _request parameter
  const functionPattern = /export async function (GET|POST|PUT|DELETE|PATCH|OPTIONS)\(_request: NextRequest\)/g;
  
  if (functionPattern.test(content)) {
    console.log(`   ✅ Found _request parameter, fixing...`);
    
    // Reset regex
    functionPattern.lastIndex = 0;
    
    // Replace _request with request in function signatures
    content = content.replace(functionPattern, 'export async function $1(request: NextRequest)');
    modified = true;
  }
  
  // Also check for helper functions with _request
  const helperPattern = /function \w+\(_request: NextRequest\)/g;
  if (helperPattern.test(content)) {
    console.log(`   ✅ Found _request in helper function, fixing...`);
    helperPattern.lastIndex = 0;
    content = content.replace(helperPattern, (match) => {
      return match.replace('_request', 'request');
    });
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`   💾 Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`   ⏭️  No changes needed`);
    return false;
  }
}

function main() {
  console.log('🚀 Fixing _request parameter issues in API routes...\n');
  
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
    console.log('\n🎉 Parameter naming issues fixed!');
    console.log('🔄 Restart your development server to see the changes.');
  } else {
    console.log('\n✨ No issues found - all files are already correct!');
  }
}

main();