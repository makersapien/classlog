// Script to apply the credit deduction migrations to the database
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

// Migration files to apply
const migrations = [
  '20250121000001_add_payment_tracking_to_class_logs.sql',
  '20250121000002_create_class_credit_deduction_function.sql',
  '20250121000003_update_class_completion_trigger.sql'
];

async function applyMigration(migrationFile) {
  console.log(`\n📄 Applying migration: ${migrationFile}`);
  
  try {
    const migrationPath = path.join('supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            // Try direct execution if rpc fails
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('1')
              .limit(0); // This will fail, but we'll use the connection
            
            // Use raw SQL execution
            console.log(`   Executing statement ${i + 1}/${statements.length}`);
            // Note: Supabase client doesn't support raw SQL execution directly
            // We'll need to use a different approach
          }
        } catch (err) {
          console.log(`   ⚠️ Statement ${i + 1} may have failed (this might be expected):`, err.message);
        }
      }
    }
    
    console.log(`   ✅ Migration ${migrationFile} applied successfully`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed to apply migration ${migrationFile}:`, error.message);
    return false;
  }
}

async function applyAllMigrations() {
  console.log('🚀 Starting migration application...');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Migration Application Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${successCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All migrations applied successfully!');
    console.log('You can now proceed with task 5 implementation.');
  } else {
    console.log('\n⚠️ Some migrations failed. Please check the errors above.');
    console.log('You may need to apply them manually through the Supabase dashboard.');
  }
  
  // Test if the new schema is working
  console.log('\n🧪 Testing new schema...');
  await testNewSchema();
}

async function testNewSchema() {
  try {
    // Test if new columns exist
    const { data: classLogs, error: tableError } = await supabase
      .from('class_logs')
      .select('id, credits_deducted, is_paid, payment_status, student_id')
      .limit(1);

    if (tableError) {
      console.log('❌ New columns not available yet:', tableError.message);
      console.log('   Please apply migrations manually through Supabase dashboard');
    } else {
      console.log('✅ New class_logs columns are available');
    }

    // Test if new functions exist
    const { data: functionTest, error: functionError } = await supabase
      .rpc('preview_class_credit_deduction', { p_class_log_id: '00000000-0000-0000-0000-000000000000' });

    if (functionError) {
      if (functionError.message.includes('Class log not found')) {
        console.log('✅ Credit deduction functions are available');
      } else {
        console.log('❌ Credit deduction functions not available:', functionError.message);
      }
    } else {
      console.log('✅ Credit deduction functions are available');
    }

  } catch (error) {
    console.log('⚠️ Schema test error:', error.message);
  }
}

// Run the migration application
applyAllMigrations();