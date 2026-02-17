#!/usr/bin/env node

// Script to apply booking system migration
const fs = require('fs');
const path = require('path');

console.log('🔧 Booking System Migration Setup...\\n');

// Check if migration files exist
const migrationFiles = [
  '../supabase/migrations/20250117000001_create_booking_system_tables.sql',
  '../supabase/migrations/20250117000002_create_booking_transaction_functions.sql'
];

console.log('1. Checking migration files...');
migrationFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  const filename = path.basename(file);
  console.log(`   ${exists ? '✅' : '❌'} ${filename}`);
});

console.log('\\n🚨 IMPORTANT: Database Migration Required');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\\nThe student booking link functionality requires database tables that may not exist yet.');
console.log('You need to apply the booking system migration to create the required tables.');

console.log('\\n📋 REQUIRED TABLES:');
console.log('  • share_tokens - For student booking links');
console.log('  • time_slots - For recurring availability patterns');
console.log('  • bookings - For tracking individual bookings');
console.log('  • blocked_slots - For teacher busy periods');
console.log('  • student_themes - For booking portal customization');

console.log('\\n🔧 HOW TO APPLY MIGRATION:');
console.log('\\n**Option 1: Using Supabase CLI (Recommended)**');
console.log('  1. Make sure you have Supabase CLI installed');
console.log('  2. Run: supabase db push');
console.log('  3. This will apply all pending migrations');

console.log('\\n**Option 2: Manual SQL Execution**');
console.log('  1. Go to your Supabase Dashboard → SQL Editor');
console.log('  2. Copy and paste the contents of:');
console.log('     - supabase/migrations/20250117000001_create_booking_system_tables.sql');
console.log('     - supabase/migrations/20250117000002_create_booking_transaction_functions.sql');
console.log('  3. Execute each migration in order');

console.log('\\n**Option 3: Using psql (Advanced)**');
console.log('  1. Connect to your Supabase database with psql');
console.log('  2. Run: \\\\i supabase/migrations/20250117000001_create_booking_system_tables.sql');
console.log('  3. Run: \\\\i supabase/migrations/20250117000002_create_booking_transaction_functions.sql');

console.log('\\n⚠️ TEMPORARY WORKAROUND APPLIED:');
console.log('  • Removed enrollments table dependency from share-link API');
console.log('  • The API will now work without enrollment checks');
console.log('  • You can generate booking links for any student');

console.log('\\n🎯 AFTER MIGRATION:');
console.log('  1. Restart your development server');
console.log('  2. Go to Dashboard → Booking Management → Student Management');
console.log('  3. Click the Link icon (🔗) next to any student');
console.log('  4. Generate and share booking links');

console.log('\\n✅ EXPECTED FUNCTIONALITY:');
console.log('  • Generate secure booking links for students');
console.log('  • Students can view available time slots');
console.log('  • Students can book slots with instant confirmation');
console.log('  • Track link usage and booking analytics');

console.log('\\n🚀 Ready to apply the migration and test the booking system!');