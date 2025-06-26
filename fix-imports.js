const fs = require('fs');
const path = require('path');

// Configuration
const UI_COMPONENTS_DIR = './src/components/ui';
const WRONG_IMPORT_PATTERNS = [
  '../../../lib/utils',
  '../../lib/utils', 
  '../lib/utils',
  '../../../../lib/utils'
];
const CORRECT_IMPORT = '@/lib/utils/utils'; // Based on your file structure

// Function to recursively get all .tsx and .ts files
function getAllFiles(dirPath, fileExtensions = ['.tsx', '.ts']) {
  const files = [];
  
  function traverseDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (fileExtensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverseDirectory(dirPath);
  return files;
}

// Function to fix imports in a single file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Check each wrong import pattern
    for (const wrongPattern of WRONG_IMPORT_PATTERNS) {
      const wrongImportRegex = new RegExp(
        `import\\s*{([^}]+)}\\s*from\\s*["']${wrongPattern.replace(/\//g, '\\/')}["']`,
        'g'
      );
      
      if (wrongImportRegex.test(content)) {
        content = content.replace(wrongImportRegex, `import {$1} from "${CORRECT_IMPORT}"`);
        hasChanges = true;
        console.log(`✅ Fixed import in: ${filePath}`);
      }
    }
    
    // Write back to file if changes were made
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔧 Starting import path fixes...\n');
  
  // Check if UI components directory exists
  if (!fs.existsSync(UI_COMPONENTS_DIR)) {
    console.error(`❌ Directory not found: ${UI_COMPONENTS_DIR}`);
    process.exit(1);
  }
  
  // Get all TypeScript/TSX files
  const files = getAllFiles(UI_COMPONENTS_DIR);
  console.log(`📂 Found ${files.length} files to check\n`);
  
  let fixedCount = 0;
  
  // Process each file
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n🎉 Completed! Fixed imports in ${fixedCount} files`);
  
  if (fixedCount === 0) {
    console.log('ℹ️  No files needed fixing - all imports are already correct!');
  } else {
    console.log('\n📋 Next steps:');
    console.log('1. Make sure you have the utils file at: src/lib/utils/utils.ts');
    console.log('2. Install dependencies: npm install clsx tailwind-merge');
    console.log('3. Test your application to ensure everything works');
  }
}

// Run the script
main();   