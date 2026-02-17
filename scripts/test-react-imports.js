#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to check React imports in a file
function checkReactImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if not a React component file
    if (!content.includes('React') && !content.includes('use') && !content.includes('jsx') && !content.includes('tsx')) {
      return null;
    }
    
    const issues = [];
    
    // Check for common React hooks/components used without imports
    const reactFeatures = [
      'useEffect',
      'useState', 
      'useCallback',
      'useMemo',
      'useRef',
      'useContext',
      'useReducer',
      'useLayoutEffect',
      'useImperativeHandle',
      'useDebugValue',
      'Suspense',
      'Fragment',
      'StrictMode',
      'createContext',
      'forwardRef',
      'memo',
      'lazy'
    ];
    
    // Get import statements
    const importLines = content.split('\n').filter(line => 
      line.trim().startsWith('import') && line.includes('react')
    );
    
    const importedFeatures = new Set();
    importLines.forEach(line => {
      reactFeatures.forEach(feature => {
        if (line.includes(feature)) {
          importedFeatures.add(feature);
        }
      });
    });
    
    // Check for usage without import
    reactFeatures.forEach(feature => {
      const regex = new RegExp(`\\b${feature}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0 && !importedFeatures.has(feature)) {
        // Skip if it's in a comment or string
        const lines = content.split('\n');
        let hasRealUsage = false;
        
        lines.forEach((line, index) => {
          if (line.includes(feature) && 
              !line.trim().startsWith('//') && 
              !line.trim().startsWith('*') &&
              !line.includes(`'${feature}'`) &&
              !line.includes(`"${feature}"`)) {
            hasRealUsage = true;
          }
        });
        
        if (hasRealUsage) {
          issues.push(`${feature} used but not imported`);
        }
      }
    });
    
    return issues.length > 0 ? { file: filePath, issues } : null;
    
  } catch (error) {
    return { file: filePath, error: error.message };
  }
}

// Function to recursively find React files
function findReactFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findReactFiles(fullPath, files);
    } else if (item.endsWith('.tsx') || item.endsWith('.jsx') || 
               (item.endsWith('.ts') && !item.endsWith('.d.ts'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

console.log('🔍 Checking React imports...\n');

const srcDir = path.join(process.cwd(), 'src');
const reactFiles = findReactFiles(srcDir);

let hasIssues = false;

reactFiles.forEach(file => {
  const result = checkReactImports(file);
  if (result) {
    if (result.error) {
      console.log(`❌ Error checking ${result.file}: ${result.error}`);
    } else if (result.issues) {
      hasIssues = true;
      console.log(`⚠️  ${result.file}:`);
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      console.log('');
    }
  }
});

if (!hasIssues) {
  console.log('✅ No React import issues found!');
} else {
  console.log('❌ Found React import issues. Please fix the imports above.');
  process.exit(1);
}