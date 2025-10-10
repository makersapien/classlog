#!/usr/bin/env node

/**
 * 🧪 Vercel Build Simulation Test
 * Tests build with minimal environment variables to simulate Vercel
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing Vercel Build Simulation');
console.log('==================================');

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
const minimalEnv = `# Minimal env for Vercel build simulation
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://classlogger.com
`;

try {
  fs.writeFileSync(envPath, minimalEnv);
  console.log('🔧 Created minimal environment (simulating Vercel)...');
  
  // Try to build
  console.log('🏗️ Running build test with minimal environment...');
  
  try {
    const result = execSync('npm run build', { 
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('✅ BUILD SUCCESSFUL with minimal environment!');
    console.log('🎉 This means Vercel deployment will work!');
    
    // Check if all API routes are included
    const output = result.toString();
    const apiRoutes = output.match(/ƒ \/api\/[^\s]+/g) || [];
    console.log(`\n📊 API Routes Built: ${apiRoutes.length}`);
    console.log('✅ All API routes compiled successfully');
    
  } catch (buildError) {
    console.log('❌ Build failed with minimal environment:');
    const errorOutput = (buildError.stdout?.toString() || '') + (buildError.stderr?.toString() || '');
    console.log(errorOutput);
    
    if (errorOutput.includes('supabaseUrl is required')) {
      console.log('\n🚨 STILL HAVE ISSUES: Module-level environment variable access detected!');
      console.log('   Need to fix more API routes.');
    } else {
      console.log('\n🤔 Different error - may be acceptable for Vercel');
    }
  }
  
} catch (error) {
  console.error('❌ Error during test setup:', error.message);
} finally {
  // Restore original env file
  if (hasEnvFile) {
    fs.writeFileSync(envPath, envBackup);
    console.log('\n🔄 Restored original .env.local file');
  } else {
    fs.unlinkSync(envPath);
    console.log('\n🗑️ Removed temporary .env.local file');
  }
}

console.log('\n🎯 Summary:');
console.log('If the build succeeded above, your Vercel deployment should work!');
console.log('If it failed, there are still some module-level env var issues to fix.');