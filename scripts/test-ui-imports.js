#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common UI components that might be missing imports
const uiComponents = [
  'Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription', 'CardFooter',
  'Button', 'Input', 'Label', 'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue',
  'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter',
  'Sheet', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetDescription',
  'Skeleton', 'Badge', 'Avatar', 'AvatarImage', 'AvatarFallback',
  'Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow',
  'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'
];

function checkUIImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if not a React component file
    if (!content.includes('import') || !content.includes('jsx') && !content.includes('tsx')) {
      return null;
    }
    
    const issues = [];
    
    // Check for UI components used without imports
    uiComponents.forEach(component => {
      const regex = new RegExp(`<${component}[\\s>]`, 'g');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        // Check if it's imported
        const importRegex = new RegExp(`import.*${component}.*from`, 'g');
        if (!content.match(importRegex)) {
          issues.push(`${component} used but not imported`);
        }
      }
    });
    
    return issues.length > 0 ? { file: filePath, issues } : null;
    
  } catch (error) {
    return { file: filePath, error: error.message };
  }
}

// Check critical dashboard files
const criticalFiles = [
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/teacher/students/page.tsx',
  'src/app/dashboard/teacher/booking/page.tsx',
  'src/app/dashboard/teacher/classes/page.tsx',
  'src/app/dashboard/parent/page.tsx'
];

console.log('🔍 Checking UI component imports...\n');

let hasIssues = false;

criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const result = checkUIImports(fullPath);
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
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

if (!hasIssues) {
  console.log('✅ No UI component import issues found in critical files!');
} else {
  console.log('❌ Found UI component import issues. These may cause runtime errors.');
}