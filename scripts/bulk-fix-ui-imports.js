#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive mapping of UI components to their import paths
const UI_COMPONENTS = {
  // Card components
  'Card': '@/components/ui/card',
  'CardContent': '@/components/ui/card',
  'CardHeader': '@/components/ui/card',
  'CardTitle': '@/components/ui/card',
  'CardDescription': '@/components/ui/card',
  'CardFooter': '@/components/ui/card',
  
  // Avatar components
  'Avatar': '@/components/ui/avatar',
  'AvatarImage': '@/components/ui/avatar',
  'AvatarFallback': '@/components/ui/avatar',
  
  // Button components
  'Button': '@/components/ui/button',
  
  // Input components
  'Input': '@/components/ui/input',
  'Label': '@/components/ui/label',
  'Textarea': '@/components/ui/textarea',
  
  // Select components
  'Select': '@/components/ui/select',
  'SelectContent': '@/components/ui/select',
  'SelectItem': '@/components/ui/select',
  'SelectTrigger': '@/components/ui/select',
  'SelectValue': '@/components/ui/select',
  
  // Dialog components
  'Dialog': '@/components/ui/dialog',
  'DialogContent': '@/components/ui/dialog',
  'DialogHeader': '@/components/ui/dialog',
  'DialogTitle': '@/components/ui/dialog',
  'DialogDescription': '@/components/ui/dialog',
  'DialogFooter': '@/components/ui/dialog',
  'DialogTrigger': '@/components/ui/dialog',
  
  // Sheet components
  'Sheet': '@/components/ui/sheet',
  'SheetContent': '@/components/ui/sheet',
  'SheetHeader': '@/components/ui/sheet',
  'SheetTitle': '@/components/ui/sheet',
  'SheetDescription': '@/components/ui/sheet',
  'SheetTrigger': '@/components/ui/sheet',
  
  // Table components
  'Table': '@/components/ui/table',
  'TableBody': '@/components/ui/table',
  'TableCell': '@/components/ui/table',
  'TableHead': '@/components/ui/table',
  'TableHeader': '@/components/ui/table',
  'TableRow': '@/components/ui/table',
  
  // Tabs components
  'Tabs': '@/components/ui/tabs',
  'TabsContent': '@/components/ui/tabs',
  'TabsList': '@/components/ui/tabs',
  'TabsTrigger': '@/components/ui/tabs',
  
  // Other common components
  'Badge': '@/components/ui/badge',
  'Skeleton': '@/components/ui/skeleton',
  'Separator': '@/components/ui/separator',
  'Progress': '@/components/ui/progress',
  'Switch': '@/components/ui/switch',
  'Checkbox': '@/components/ui/checkbox',
  'RadioGroup': '@/components/ui/radio-group',
  'RadioGroupItem': '@/components/ui/radio-group',
  'Slider': '@/components/ui/slider',
  'Toast': '@/components/ui/toast',
  'Toaster': '@/components/ui/toast',
  'Tooltip': '@/components/ui/tooltip',
  'TooltipContent': '@/components/ui/tooltip',
  'TooltipProvider': '@/components/ui/tooltip',
  'TooltipTrigger': '@/components/ui/tooltip',
  'Popover': '@/components/ui/popover',
  'PopoverContent': '@/components/ui/popover',
  'PopoverTrigger': '@/components/ui/popover',
  'HoverCard': '@/components/ui/hover-card',
  'HoverCardContent': '@/components/ui/hover-card',
  'HoverCardTrigger': '@/components/ui/hover-card',
  'DropdownMenu': '@/components/ui/dropdown-menu',
  'DropdownMenuContent': '@/components/ui/dropdown-menu',
  'DropdownMenuItem': '@/components/ui/dropdown-menu',
  'DropdownMenuTrigger': '@/components/ui/dropdown-menu',
  'DropdownMenuSeparator': '@/components/ui/dropdown-menu',
  'DropdownMenuLabel': '@/components/ui/dropdown-menu',
  'Command': '@/components/ui/command',
  'CommandInput': '@/components/ui/command',
  'CommandList': '@/components/ui/command',
  'CommandEmpty': '@/components/ui/command',
  'CommandGroup': '@/components/ui/command',
  'CommandItem': '@/components/ui/command',
  'CommandSeparator': '@/components/ui/command',
  'Accordion': '@/components/ui/accordion',
  'AccordionContent': '@/components/ui/accordion',
  'AccordionItem': '@/components/ui/accordion',
  'AccordionTrigger': '@/components/ui/accordion',
  'AlertDialog': '@/components/ui/alert-dialog',
  'AlertDialogAction': '@/components/ui/alert-dialog',
  'AlertDialogCancel': '@/components/ui/alert-dialog',
  'AlertDialogContent': '@/components/ui/alert-dialog',
  'AlertDialogDescription': '@/components/ui/alert-dialog',
  'AlertDialogFooter': '@/components/ui/alert-dialog',
  'AlertDialogHeader': '@/components/ui/alert-dialog',
  'AlertDialogTitle': '@/components/ui/alert-dialog',
  'AlertDialogTrigger': '@/components/ui/alert-dialog',
  'Alert': '@/components/ui/alert',
  'AlertDescription': '@/components/ui/alert',
  'AlertTitle': '@/components/ui/alert'
};

function fixUIImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if not a React component file
    if (!content.includes('import') || (!content.includes('.tsx') && !content.includes('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.jsx'))) {
      return { success: false, error: 'Not a React component file' };
    }
    
    let newContent = content;
    let hasChanges = false;
    const addedImports = new Set();
    
    // Find components used in the file
    const usedComponents = new Set();
    
    Object.keys(UI_COMPONENTS).forEach(component => {
      // Look for component usage: <Component or <Component> or <Component 
      const regex = new RegExp(`<${component}[\\s>]`, 'g');
      if (content.match(regex)) {
        usedComponents.add(component);
      }
    });
    
    if (usedComponents.size === 0) {
      return { success: false, error: 'No UI components found' };
    }
    
    // Group components by import path
    const importGroups = {};
    usedComponents.forEach(component => {
      const importPath = UI_COMPONENTS[component];
      if (!importGroups[importPath]) {
        importGroups[importPath] = [];
      }
      importGroups[importPath].push(component);
    });
    
    // Check existing imports and add missing ones
    const lines = newContent.split('\n');
    let importInsertIndex = -1;
    
    // Find where to insert imports (after existing imports)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('import') && !line.includes('//')) {
        importInsertIndex = i + 1;
      } else if (line.trim() === '' && importInsertIndex > -1) {
        // Found empty line after imports
        break;
      } else if (!line.includes('import') && !line.startsWith('//') && !line.startsWith('/*') && line.trim() !== '' && importInsertIndex > -1) {
        // Found non-import line
        break;
      }
    }
    
    // If no imports found, insert at the top (after 'use client' if present)
    if (importInsertIndex === -1) {
      importInsertIndex = 0;
      if (lines[0] && lines[0].includes("'use client'")) {
        importInsertIndex = 1;
        if (lines[1] === '') importInsertIndex = 2;
      }
    }
    
    // Process each import group
    Object.entries(importGroups).forEach(([importPath, components]) => {
      // Check if this import already exists
      const existingImportLine = lines.find(line => 
        line.includes(`from '${importPath}'`) || line.includes(`from "${importPath}"`)
      );
      
      if (existingImportLine) {
        // Update existing import
        const existingIndex = lines.indexOf(existingImportLine);
        const existingComponents = [];
        
        // Extract existing components
        const match = existingImportLine.match(/import\s*\{([^}]+)\}/);
        if (match) {
          existingComponents.push(...match[1].split(',').map(c => c.trim()));
        }
        
        // Add new components
        const allComponents = [...new Set([...existingComponents, ...components])].sort();
        const newImportLine = `import { ${allComponents.join(', ')} } from '${importPath}'`;
        
        if (newImportLine !== existingImportLine) {
          lines[existingIndex] = newImportLine;
          hasChanges = true;
          addedImports.add(`Updated: ${importPath}`);
        }
      } else {
        // Add new import
        const newImportLine = `import { ${components.sort().join(', ')} } from '${importPath}'`;
        lines.splice(importInsertIndex, 0, newImportLine);
        importInsertIndex++;
        hasChanges = true;
        addedImports.add(`Added: ${importPath}`);
      }
    });
    
    if (hasChanges) {
      newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
      return { 
        success: true, 
        changes: Array.from(addedImports),
        componentsFixed: Array.from(usedComponents)
      };
    }
    
    return { success: false, error: 'No changes needed' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find all React component files
function findReactFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        findReactFiles(fullPath, files);
      } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Warning: Could not read directory ${dir}: ${error.message}`);
  }
  
  return files;
}

console.log('🔧 Bulk fixing UI component imports...\n');

const srcDir = path.join(process.cwd(), 'src');
const reactFiles = findReactFiles(srcDir);

let fixedCount = 0;
let totalComponents = 0;

console.log(`Found ${reactFiles.length} React component files\n`);

reactFiles.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  const result = fixUIImports(file);
  
  if (result.success) {
    fixedCount++;
    totalComponents += result.componentsFixed.length;
    console.log(`✅ Fixed ${relativePath}`);
    console.log(`   Components: ${result.componentsFixed.join(', ')}`);
    console.log(`   Changes: ${result.changes.join(', ')}`);
    console.log('');
  } else if (result.error !== 'No UI components found' && result.error !== 'No changes needed' && result.error !== 'Not a React component file') {
    console.log(`❌ Error fixing ${relativePath}: ${result.error}`);
  }
});

console.log(`\n🎯 Summary:`);
console.log(`✅ Fixed ${fixedCount} files`);
console.log(`🔧 Fixed ${totalComponents} component imports`);

if (fixedCount > 0) {
  console.log('\n🔄 Please restart your development server to see the changes.');
  console.log('💡 The UI component import errors should now be resolved!');
} else {
  console.log('\n✅ No UI component import issues found or all were already fixed.');
}