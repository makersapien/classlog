// Script to apply only the credit deduction migrations using Supabase CLI
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Our specific migration files
const migrations = [
  '20250121000001_add_payment_tracking_to_class_logs.sql',
  '20250121000002_create_class_credit_deduction_function.sql',
  '20250121000003_update_class_completion_trigger.sql'
];

async function applyMigrationViaCLI(migrationFile) {
  console.log(`\n📄 Applying migration: ${migrationFile}`);

  try {
    const migrationPath = path.join('supabase', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Create a temporary SQL file
    const tempFile = `temp_${migrationFile}`;
    fs.writeFileSync(tempFile, migrationSQL);

    // Use supabase db remote to execute the SQL
    console.log(`   Executing SQL via Supabase CLI...`);

    try {
      // Try to execute the SQL file
      const result = execSync(`supabase db remote exec --file ${tempFile}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log(`   ✅ Migration ${migrationFile} applied successfully`);
      console.log(`   Output: ${result}`);

      // Clean up temp file
      fs.unlinkSync(tempFile);
      return true;

    } catch (execError) {
      console.log(`   ❌ Failed to execute ${migrationFile}:`);
      console.log(`   Error: ${execError.message}`);

      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      return false;
    }

  } catch (error) {
    console.error(`   ❌ Failed to read migration ${migrationFile}:`, error.message);
    return false;
  }
}

async function applyAllCreditMigrations() {
  console.log('🚀 Applying Credit Deduction Migrations...');
  console.log('='.repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await applyMigrationViaCLI(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Migration Application Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${successCount + failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All credit deduction migrations applied successfully!');
    console.log('Now testing the new schema...');
    await testMigrations();
  } else {
    console.log('\n⚠️ Some migrations failed. You may need to apply them manually.');
    console.log('Check the Supabase dashboard SQL editor for more details.');
  }
}

async function testMigrations() {
  console.log('\n🧪 Testing applied migrations...');

  try {
    // Test the new schema using our existing test script
    const { execSync } = require('child_process');
    const result = execSync('NEXT_PUBLIC_SUPABASE_URL=https://ptacvbijmjoteceybnod.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YWN2YmlqbWpvdGVjZXlibm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgxNzI5NywiZXhwIjoyMDY1MzkzMjk3fQ.U02ibbq0w_FmCJVnsfub7ct9xiAAFSNkiPLKUaaiZ1I node scripts/test-credit-deduction-simple.js', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log('Test results:');
    console.log(result);

  } catch (error) {
    console.log('⚠️ Test execution failed, but migrations may still be applied');
    console.log('You can manually test by running: node scripts/test-credit-deduction-simple.js');
  }
}

// Run the migration application
applyAllCreditMigrations();