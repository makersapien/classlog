#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common variable naming patterns that cause issues
const VARIABLE_FIXES = [
  // Supabase error variable patterns
  {
    pattern: /const\s*{\s*data:\s*([^,}]+),\s*error:\s*__([^}]+)\s*}\s*=/g,
    replacement: 'const { data: $1, error: $2 } =',
    description: 'Fix double underscore error variables'
  },
  {
    pattern: /const\s*{\s*([^,}]+),\s*error:\s*__([^}]+)\s*}\s*=/g,
    replacement: 'const { $1, error: $2 } =',
    description: 'Fix double underscore error variables (no data destructuring)'
  },
  {
    pattern: /const\s*{\s*error:\s*__([^}]+)\s*}\s*=/g,
    replacement: 'const { error: $1 } =',
    description: 'Fix double underscore error variables (error only)'
  }
];

function fixVariableNaming(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;
    const appliedFixes = [];

    // Apply each fix pattern
    VARIABLE_FIXES.forEach(fix => {
      const matches = content.match(fix.pattern);
      if (matches && matches.length > 0) {
        const beforeContent = newContent;
        newContent = newContent.replace(fix.pattern, fix.replacement);
        
        if (beforeContent !== newContent) {
          hasChanges = true;
          appliedFixes.push({
            description: fix.description,
            matches: matches.length
          });
        }
      }
    });

    // Also check for usage of variables that might be undefined
    const lines = newContent.split('\n');
    const additionalFixes = [];

    lines.forEach((line, index) => {
      // Look for common undefined variable patterns
      if (line.includes('if (profileError)') && !line.includes('const') && !newContent.includes('error: profileError')) {
        // This suggests profileError is used but not properly defined
        additionalFixes.push({
          line: index + 1,
          issue: 'profileError used but may not be properly defined',
          suggestion: 'Check variable destructuring above this line'
        });
      }
      
      if (line.includes('if (sessionError)') && !line.includes('const') && !newContent.includes('error: sessionError')) {
        additionalFixes.push({
          line: index + 1,
          issue: 'sessionError used but may not be properly defined',
          suggestion: 'Check variable destructuring above this line'
        });
      }
      
      if (line.includes('if (createError)') && !line.includes('const') && !newContent.includes('error: createError')) {
        additionalFixes.push({
          line: index + 1,
          issue: 'createError used but may not be properly defined',
          suggestion: 'Check variable destructuring above this line'
        });
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      return { 
        success: true, 
        appliedFixes,
        additionalIssues: additionalFixes
      };
    }

    if (additionalFixes.length > 0) {
      return {
        success: false,
        error: 'Potential issues found but no automatic fixes applied',
        additionalIssues: additionalFixes
      };
    }

    return { success: false, error: 'No issues found' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find all TypeScript/JavaScript files
function findCodeFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findCodeFiles(fullPath, files);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Warning: Could not read directory ${dir}: ${error.message}`);
  }
  
  return files;
}

console.log('🔧 Fixing variable naming issues...\n');

const srcDir = path.join(process.cwd(), 'src');
const codeFiles = findCodeFiles(srcDir);

let fixedCount = 0;
let issuesFound = 0;

console.log(`Found ${codeFiles.length} code files\n`);

codeFiles.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  const result = fixVariableNaming(file);
  
  if (result.success) {
    fixedCount++;
    console.log(`✅ Fixed ${relativePath}`);
    result.appliedFixes.forEach(fix => {
      console.log(`   - ${fix.description} (${fix.matches} matches)`);
    });
    
    if (result.additionalIssues && result.additionalIssues.length > 0) {
      console.log(`   ⚠️  Additional issues to review:`);
      result.additionalIssues.forEach(issue => {
        console.log(`     Line ${issue.line}: ${issue.issue}`);
      });
    }
    console.log('');
  } else if (result.additionalIssues && result.additionalIssues.length > 0) {
    issuesFound++;
    console.log(`⚠️  Issues found in ${relativePath}:`);
    result.additionalIssues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.issue}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
    console.log('');
  } else if (result.error !== 'No issues found') {
    console.log(`❌ Error checking ${relativePath}: ${result.error}`);
  }
});

console.log(`\n🎯 Summary:`);
console.log(`✅ Fixed ${fixedCount} files`);
if (issuesFound > 0) {
  console.log(`⚠️  Found potential issues in ${issuesFound} files (review manually)`);
}

if (fixedCount > 0) {
  console.log('\n🔄 Please restart your development server to see the changes.');
  console.log('💡 Variable naming errors should now be resolved!');
} else if (issuesFound === 0) {
  console.log('\n✅ No variable naming issues found.');
} else {
  console.log('\n💡 Review the issues above and fix them manually if needed.');
}