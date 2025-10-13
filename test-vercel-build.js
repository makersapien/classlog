#!/usr/bin/env node

/**
 * 🧪 Vercel Build Environment Simulator
 * This exactly replicates Vercel's build environment to catch the issue
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Vercel Build Environment Simulator');
console.log('====================================');

// Step 1: Backup current environment
const envPath = '.env.local';
let envBackup = '';
let hasEnvFile = false;

if (fs.existsSync(envPath)) {
  envBackup = fs.readFileSync(envPath, 'utf8');
  hasEnvFile = true;
  console.log('📋 Backing up current .env.local...');
}

try {
  // Step 2: Create Vercel-like environment (NO Supabase env vars)
  const vercelEnv = `# Vercel Build Environment Simulation
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://classlogger.com
# Note: Supabase env vars are NOT available during build in Vercel
`;

  fs.writeFileSync(envPath, vercelEnv);
  console.log('🔧 Created Vercel-like environment (no Supabase env vars)');

  // Step 3: Clear Next.js cache
  console.log('🗑️ Clearing Next.js cache...');
  try {
    execSync('rm -rf .next', { stdio: 'pipe' });
  } catch (e) {
    // Ignore if .next doesn't exist
  }

  // Step 4: Try to build
  console.log('🏗️ Running build in Vercel-like environment...');
  
  try {
    const buildOutput = execSync('npm run build', { 
      stdio: 'pipe',
      timeout: 180000, // 3 minutes
      encoding: 'utf8'
    });
    
    console.log('✅ BUILD SUCCEEDED in Vercel-like environment!');
    console.log('   This means the issue is likely with Vercel configuration,');
    console.log('   not with the code itself.');
    
  } catch (buildError) {
    console.log('❌ BUILD FAILED in Vercel-like environment:');
    console.log('');
    
    const stdout = buildError.stdout || '';
    const stderr = buildError.stderr || '';
    const output = stdout + stderr;
    
    // Look for specific error patterns
    if (output.includes('supabaseUrl is required')) {
      console.log('🎯 FOUND THE ISSUE: supabaseUrl is required');
      console.log('   This confirms there are still module-level Supabase clients');
      
      // Try to identify the specific file
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('Failed to collect page data for')) {
          const match = line.match(/Failed to collect page data for (.+?)\]/);
          if (match) {
            console.log(`🔍 Problematic route: ${match[1]}`);
          }
        }
      }
    }
    
    if (output.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      console.log('🎯 FOUND THE ISSUE: Missing NEXT_PUBLIC_SUPABASE_URL');
      console.log('   Some code is trying to access this env var at build time');
    }
    
    if (output.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log('🎯 FOUND THE ISSUE: Missing SUPABASE_SERVICE_ROLE_KEY');
      console.log('   Some code is trying to access this env var at build time');
    }
    
    // Show relevant parts of the error
    console.log('\n📋 Build Error Output:');
    console.log('─'.repeat(50));
    
    const relevantLines = output.split('\n').filter(line => 
      line.includes('Error:') || 
      line.includes('Failed to') ||
      line.includes('supabase') ||
      line.includes('SUPABASE') ||
      line.includes('at ') ||
      line.includes('route.ts')
    );
    
    relevantLines.slice(0, 20).forEach(line => {
      console.log(line);
    });
    
    if (relevantLines.length > 20) {
      console.log('... (truncated)');
    }
  }

} finally {
  // Step 5: Restore original environment
  if (hasEnvFile) {
    fs.writeFileSync(envPath, envBackup);
    console.log('\n🔄 Restored original .env.local');
  } else {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      console.log('\n🗑️ Removed temporary .env.local');
    }
  }
}

console.log('\n🎯 Next Steps:');
console.log('1. If build succeeded: Check Vercel environment variables');
console.log('2. If build failed: Fix the identified module-level imports');
console.log('3. Run this test again until build succeeds');
console.log('4. Then deploy to Vercel');

console.log('\n💡 Remember: The goal is for the build to succeed');
console.log('   even when Supabase environment variables are missing!');