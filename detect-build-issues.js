#!/usr/bin/env node

/**
 * 🔍 Build Issue Detector - Find Vercel Build Problems Locally
 * This script simulates Vercel's build environment to catch issues early
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ClassLogger Build Issue Detector');
console.log('=====================================');

// Step 1: Find all API routes with module-level Supabase clients
console.log('\n📁 Step 1: Scanning for problematic Supabase client patterns...');

function findProblematicFiles() {
  const problematicFiles = [];
  const apiDir = 'src/app/api';
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for module-level Supabase client creation
        const lines = content.split('\n');
        let hasModuleLevelSupabase = false;
        let inFunction = false;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Track if we're inside a function
          if (line.includes('export async function') || line.includes('async function')) {
            inFunction = true;
            braceCount = 0;
          }
          
          // Count braces to track function scope
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          if (inFunction && braceCount === 0 && line.includes('}')) {
            inFunction = false;
          }
          
          // Check for problematic patterns
          if (!inFunction && line.includes('createClient(') && line.includes('process.env')) {
            hasModuleLevelSupabase = true;
            problematicFiles.push({
              file: filePath,
              line: i + 1,
              content: line
            });
            break;
          }
        }
      }
    }
  }
  
  if (fs.existsSync(apiDir)) {
    scanDirectory(apiDir);
  }
  
  return problematicFiles;
}

const problematicFiles = findProblematicFiles();

if (problematicFiles.length > 0) {
  console.log('❌ Found problematic files:');
  problematicFiles.forEach(({ file, line, content }) => {
    console.log(`   ${file}:${line}`);
    console.log(`   ${content}`);
  });
} else {
  console.log('✅ No module-level Supabase clients found');
}

// Step 2: Test build without environment variables
console.log('\n🧪 Step 2: Testing build without environment variables...');

try {
  // Backup current env file
  const envPath = '.env.local';
  let envBackup = '';
  let hasEnvFile = false;
  
  if (fs.existsSync(envPath)) {
    envBackup = fs.readFileSync(envPath, 'utf8');
    hasEnvFile = true;
    console.log('📋 Backing up .env.local file...');
  }
  
  // Create minimal env file (simulating Vercel build environment)
  const minimalEnv = `# Minimal env for build testing
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://classlogger.com
`;
  
  fs.writeFileSync(envPath, minimalEnv);
  console.log('🔧 Created minimal environment (simulating Vercel)...');
  
  // Try to build
  console.log('🏗️ Running build test...');
  
  try {
    execSync('npm run build', { 
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✅ Build succeeded with minimal environment!');
  } catch (buildError) {
    console.log('❌ Build failed with minimal environment:');
    console.log(buildError.stdout?.toString() || '');
    console.log(buildError.stderr?.toString() || '');
    
    // Check if it's the supabaseUrl error
    const errorOutput = (buildError.stdout?.toString() || '') + (buildError.stderr?.toString() || '');
    if (errorOutput.includes('supabaseUrl is required')) {
      console.log('\n🎯 DETECTED: This is the same error you\'re seeing in Vercel!');
      console.log('   The issue is module-level environment variable access.');
    }
  }
  
  // Restore original env file
  if (hasEnvFile) {
    fs.writeFileSync(envPath, envBackup);
    console.log('🔄 Restored original .env.local file');
  } else {
    fs.unlinkSync(envPath);
    console.log('🗑️ Removed temporary .env.local file');
  }
  
} catch (error) {
  console.error('❌ Error during build testing:', error.message);
}

// Step 3: Provide recommendations
console.log('\n💡 Recommendations:');
console.log('==================');

if (problematicFiles.length > 0) {
  console.log('1. Fix module-level Supabase clients:');
  console.log('   Move createClient() calls inside API functions');
  console.log('   Example:');
  console.log('   ❌ const supabase = createClient(env.VAR) // Module level');
  console.log('   ✅ function handler() { const supabase = createClient(env.VAR) } // Inside function');
  console.log('');
}

console.log('2. Test locally with minimal environment:');
console.log('   - Temporarily remove most env vars from .env.local');
console.log('   - Keep only NEXT_PUBLIC_APP_URL and NODE_ENV');
console.log('   - Run npm run build');
console.log('   - This simulates Vercel\'s build environment');
console.log('');

console.log('3. Use this command to detect issues:');
console.log('   node detect-build-issues.js');
console.log('');

console.log('4. Environment variables needed in Vercel:');
console.log('   - NEXT_PUBLIC_SUPABASE_URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('   - NEXT_PUBLIC_GOOGLE_CLIENT_ID');
console.log('   - GOOGLE_CLIENT_SECRET');
console.log('   - JWT_SECRET');
console.log('   - NEXT_PUBLIC_APP_URL');

console.log('\n🎯 Summary:');
if (problematicFiles.length === 0) {
  console.log('✅ No obvious issues detected locally');
  console.log('   The Vercel error might be due to:');
  console.log('   - Missing environment variables in Vercel dashboard');
  console.log('   - Different build environment in Vercel');
  console.log('   - Caching issues (try clearing Vercel cache)');
} else {
  console.log('❌ Issues detected that need fixing');
  console.log('   Fix the module-level Supabase clients listed above');
}

console.log('\n🚀 Ready to fix? Run the fixes and test again!');