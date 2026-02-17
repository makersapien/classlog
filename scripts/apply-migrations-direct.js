// Script to apply credit deduction migrations directly via Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Our specific migration files
const migrations = [
  '20250121000001_add_payment_tracking_to_class_logs.sql',
  '20250121000002_create_class_credit_deduction_function.sql', 
  '20250121000003_update_class_completion_trigger.sql'
];

async function executeSQLStatement(sql, description) {
  try {
    // For DDL statements, we need to use a different approach
    // Let's try using a simple query that will execute the SQL
    const { error } = await supabase.rpc('exec', { sql: sql });
    
    if (error) {
      // If the exec function doesn't exist, try a different approach
      console.log(`   ⚠️ ${description}: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ ${description}: Success`);
    return true;
    
  } catch (err) {
    console.log(`   ❌ ${description}: ${err.message}`);
    return false;
  }
}

async function applyMigrationManually(migrationFile) {
  console.log(`\n📄 Applying migration: ${migrationFile}`);
  
  try {
    const migrationPath = path.join('supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        const success = await executeSQLStatement(statement, `Statement ${i + 1}`);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   📊 Migration ${migrationFile}: ${successCount} success, ${failCount} failed`);
    return failCount === 0;
    
  } catch (error) {
    console.error(`   ❌ Failed to process migration ${migrationFile}:`, error.message);
    return false;
  }
}

async function applyAllMigrations() {
  console.log('🚀 Applying Credit Deduction Migrations via Direct SQL...');
  console.log('=' .repeat(70));
  
  // First, let's check if we can connect to the database
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('❌ Cannot connect to database:', error.message);
      return;
    }
    console.log('✅ Database connection successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const migration of migrations) {
    const success = await applyMigrationManually(migration);
    if (success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🏁 Migration Application Summary');
  console.log('=' .repeat(70));
  console.log(`✅ Successful migrations: ${totalSuccess}`);
  console.log(`❌ Failed migrations: ${totalFailed}`);
  console.log(`📊 Total: ${totalSuccess + totalFailed}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All migrations applied successfully!');
  } else {
    console.log('\n⚠️ Some migrations failed. This is expected since Supabase client');
    console.log('   cannot execute DDL statements directly.');
    console.log('\n📋 Manual Application Required:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Open the SQL Editor');
    console.log('   3. Copy and paste the contents of scripts/migration-commands.sql');
    console.log('   4. Execute the SQL commands');
  }
  
  // Test the current state
  console.log('\n🧪 Testing current database state...');
  await testCurrentState();
}

async function testCurrentState() {
  try {
    // Test if new columns exist
    const { data: classLogs, error: tableError } = await supabase
      .from('class_logs')
      .select('id, credits_deducted, is_paid, payment_status, student_id')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('column') && tableError.message.includes('does not exist')) {
        console.log('❌ New columns not yet applied - manual migration needed');
      } else {
        console.log('⚠️ Table test error:', tableError.message);
      }
    } else {
      console.log('✅ New class_logs columns are available!');
    }

    // Test if new functions exist
    const { data: functionTest, error: functionError } = await supabase
      .rpc('preview_class_credit_deduction', { p_class_log_id: '00000000-0000-0000-0000-000000000000' });

    if (functionError) {
      if (functionError.message.includes('Class log not found')) {
        console.log('✅ Credit deduction functions are available!');
      } else if (functionError.message.includes('Could not find')) {
        console.log('❌ Credit deduction functions not yet applied - manual migration needed');
      } else {
        console.log('⚠️ Function test error:', functionError.message);
      }
    } else {
      console.log('✅ Credit deduction functions are available!');
    }

  } catch (error) {
    console.log('⚠️ Database test error:', error.message);
  }
}

// Run the migration application
applyAllMigrations();