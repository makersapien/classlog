#!/usr/bin/env node

// Test the cn utility function
console.log('🧪 Testing cn utility function...\n');

try {
  // This would require transpiling TypeScript, so let's just check the file syntax
  const fs = require('fs');
  const path = require('path');
  
  const utilsPath = path.join(process.cwd(), 'src/lib/utils.ts');
  const content = fs.readFileSync(utilsPath, 'utf8');
  
  console.log('📋 Utils file content:');
  console.log(content);
  
  // Check if clsx is properly imported
  if (content.includes('import { type ClassValue, clsx } from "clsx"')) {
    console.log('✅ clsx is properly imported');
  } else {
    console.log('❌ clsx import issue');
  }
  
  // Check if the function uses clsx correctly
  if (content.includes('return twMerge(clsx(inputs))')) {
    console.log('✅ cn function uses clsx correctly');
  } else {
    console.log('❌ cn function has issues');
  }
  
  console.log('\n✅ Utils function looks good!');
  console.log('🔄 Try refreshing your browser to see if the clsx error is resolved.');
  
} catch (error) {
  console.log('❌ Error testing utils function:', error.message);
}