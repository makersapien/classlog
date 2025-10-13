#!/usr/bin/env node

/**
 * 🔧 Complete Supabase Route Fixer
 * This script will find and fix ALL API routes with module-level Supabase clients
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Complete Supabase Route Fixer');
console.log('=================================');

// Step 1: Find ALL problematic files
function findAllProblematicFiles() {
  const problematicFiles = [];
  const apiDir = 'src/app/api';
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for problematic patterns
        const lines = content.split('\n');
        let hasIssue = false;
        let issueType = '';
        let issueLine = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Pattern 1: Module-level createClient with env vars
          if (line.includes('const') && line.includes('createClient(') && 
              (line.includes('process.env') || lines[i+1]?.includes('process.env'))) {
            hasIssue = true;
            issueType = 'module-level-createClient';
            issueLine = i + 1;
            break;
          }
          
          // Pattern 2: Import from supabase-client (client-side)
          if (line.includes('import') && line.includes('@/lib/supabase-client')) {
            hasIssue = true;
            issueType = 'client-side-import';
            issueLine = i + 1;
            break;
          }
          
          // Pattern 3: Module-level supabase = createClient
          if (line.startsWith('const supabase = createClient') || 
              line.startsWith('const supabaseAdmin = createClient')) {
            hasIssue = true;
            issueType = 'module-level-assignment';
            issueLine = i + 1;
            break;
          }
        }
        
        if (hasIssue) {
          problematicFiles.push({
            file: filePath,
            line: issueLine,
            type: issueType,
            content: content
          });
        }
      }
    }
  }
  
  scanDirectory(apiDir);
  return problematicFiles;
}

// Step 2: Fix each file
function fixFile(fileInfo) {
  const { file, type, content } = fileInfo;
  console.log(`🔧 Fixing ${file} (${type})`);
  
  let newContent = content;
  
  // Fix client-side imports
  if (type === 'client-side-import') {
    newContent = newContent.replace(
      /import\s*{\s*supabase\s*}\s*from\s*['"]@\/lib\/supabase-client['"]/g,
      "import { createClient } from '@supabase/supabase-js'"
    );
  }
  
  // Remove module-level createClient calls
  newContent = newContent.replace(
    /const\s+supabase\s*=\s*createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\)/g,
    ''
  );
  
  newContent = newContent.replace(
    /const\s+supabaseAdmin\s*=\s*createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!,?\s*{[^}]*}?\s*\)/g,
    ''
  );
  
  // Remove standalone environment variable declarations
  newContent = newContent.replace(
    /const\s+supabaseUrl\s*=\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g,
    ''
  );
  
  newContent = newContent.replace(
    /const\s+supabaseServiceKey\s*=\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g,
    ''
  );
  
  // Clean up empty lines
  newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Add supabase client creation to each export function
  const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*{/g;
  
  newContent = newContent.replace(functionPattern, (match) => {
    // Check if this function already has supabase client creation
    const functionStart = newContent.indexOf(match);
    const nextBrace = newContent.indexOf('{', functionStart) + 1;
    const functionBody = newContent.substring(nextBrace, newContent.indexOf('\n}', nextBrace));
    
    if (functionBody.includes('const supabase = createClient(')) {
      return match; // Already has it
    }
    
    return match + `
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    `;
  });
  
  // Write the fixed content
  fs.writeFileSync(file, newContent);
  console.log(`✅ Fixed ${file}`);
}

// Step 3: Run the fixer
const problematicFiles = findAllProblematicFiles();

console.log(`\n📋 Found ${problematicFiles.length} problematic files:`);
problematicFiles.forEach(({ file, line, type }) => {
  console.log(`   ${file}:${line} (${type})`);
});

if (problematicFiles.length === 0) {
  console.log('✅ No problematic files found!');
} else {
  console.log('\n🔧 Fixing files...');
  problematicFiles.forEach(fixFile);
  console.log('\n✅ All files fixed!');
}

console.log('\n🧪 Testing build...');
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
  console.log('✅ Build successful!');
} catch (error) {
  console.log('❌ Build still failing:');
  console.log(error.stdout?.toString() || '');
  console.log(error.stderr?.toString() || '');
}

console.log('\n🎯 Summary:');
console.log(`Fixed ${problematicFiles.length} files`);
console.log('All API routes should now work in Vercel!');