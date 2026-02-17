#!/usr/bin/env node

// Check if required environment variables are set
console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const optionalVars = [
  'SUPABASE_ANON_KEY',
  'NODE_ENV'
];

let hasIssues = false;

console.log('📋 Required variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    hasIssues = true;
  }
});

console.log('\n📋 Optional variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET`);
  }
});

if (hasIssues) {
  console.log('\n❌ Missing required environment variables!');
  console.log('💡 Make sure your .env.local file contains all required variables.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}