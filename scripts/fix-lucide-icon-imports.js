#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common Lucide React icons that might be missing imports
const LUCIDE_ICONS = [
  'Plus', 'Minus', 'X', 'Check', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'User', 'Users', 'Settings',
  'Search', 'Filter', 'Edit', 'Trash', 'Save', 'Download', 'Upload', 'Copy', 'Share',
  'Heart', 'Star', 'BookOpen', 'Book', 'Calendar', 'Clock', 'Mail', 'Phone', 'MapPin',
  'CreditCard', 'DollarSign', 'ShoppingCart', 'Package', 'Truck', 'CheckCircle', 'XCircle',
  'AlertCircle', 'Info', 'HelpCircle', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key',
  'Menu', 'MoreHorizontal', 'MoreVertical', 'Grid', 'List', 'Layout', 'Sidebar',
  'Bell', 'BellOff', 'Volume2', 'VolumeX', 'Play', 'Pause', 'Stop', 'SkipForward',
  'SkipBack', 'FastForward', 'Rewind', 'Repeat', 'Shuffle', 'Camera', 'Image',
  'File', 'FileText', 'Folder', 'FolderOpen', 'Archive', 'Paperclip', 'Link',
  'ExternalLink', 'Globe', 'Wifi', 'WifiOff', 'Bluetooth', 'Battery', 'Power',
  'Refresh', 'RotateCcw', 'RotateCw', 'Maximize', 'Minimize', 'Square', 'Circle',
  'Triangle', 'Hexagon', 'Zap', 'Flame', 'Sun', 'Moon', 'Cloud', 'CloudRain',
  'Umbrella', 'Thermometer', 'Activity', 'BarChart', 'PieChart', 'TrendingUp',
  'TrendingDown', 'Target', 'Award', 'Gift', 'Tag', 'Bookmark', 'Flag', 'Compass',
  'Navigation', 'Send', 'MessageCircle', 'MessageSquare', 'Mic', 'MicOff', 'Video',
  'VideoOff', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Headphones', 'Speaker',
  'Printer', 'Scanner', 'Cpu', 'HardDrive', 'Server', 'Database', 'Code', 'Terminal',
  'Command', 'Hash', 'AtSign', 'Percent', 'Type', 'Bold', 'Italic', 'Underline',
  'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'Indent', 'Outdent',
  'Scissors', 'Clipboard', 'PenTool', 'Paintbrush', 'Palette', 'Layers', 'Move',
  'Crop', 'CornerUpLeft', 'CornerUpRight', 'CornerDownLeft', 'CornerDownRight',
  'MousePointer', 'Hand', 'Grab', 'Crosshair', 'Loader', 'Loader2', 'RefreshCw',
  'RotateCcw', 'RotateCw', 'Shuffle', 'Repeat', 'Repeat1', 'PlayCircle', 'PauseCircle',
  'StopCircle', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Mic', 'MicOff',
  'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'PhoneMissed', 'PhoneOff'
];

function fixLucideImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if not a React component file or doesn't use lucide-react
    if (!content.includes('lucide-react')) {
      return { success: false, error: 'No lucide-react imports found' };
    }
    
    let newContent = content;
    let hasChanges = false;
    const addedIcons = [];
    
    // Find icons used in the file
    const usedIcons = new Set();
    
    LUCIDE_ICONS.forEach(icon => {
      // Look for icon usage: <Icon or <Icon> or <Icon 
      const regex = new RegExp(`<${icon}[\\s>]`, 'g');
      if (content.match(regex)) {
        usedIcons.add(icon);
      }
    });
    
    if (usedIcons.size === 0) {
      return { success: false, error: 'No Lucide icons found in usage' };
    }
    
    // Find existing lucide-react import
    const lines = newContent.split('\n');
    let lucideImportIndex = -1;
    let existingIcons = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('from \'lucide-react\'') || line.includes('from "lucide-react"')) {
        lucideImportIndex = i;
        
        // Extract existing icons
        const match = line.match(/import\s*\{([^}]+)\}/);
        if (match) {
          existingIcons = match[1].split(',').map(icon => icon.trim());
        }
        break;
      }
    }
    
    if (lucideImportIndex === -1) {
      return { success: false, error: 'No lucide-react import found' };
    }
    
    // Check which icons are missing
    const missingIcons = Array.from(usedIcons).filter(icon => !existingIcons.includes(icon));
    
    if (missingIcons.length === 0) {
      return { success: false, error: 'All icons already imported' };
    }
    
    // Add missing icons to import
    const allIcons = [...existingIcons, ...missingIcons].sort();
    const newImportLine = `import { ${allIcons.join(', ')} } from 'lucide-react'`;
    
    lines[lucideImportIndex] = newImportLine;
    newContent = lines.join('\n');
    hasChanges = true;
    addedIcons.push(...missingIcons);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      return { 
        success: true, 
        addedIcons,
        totalIcons: allIcons.length
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

console.log('🔧 Fixing Lucide React icon imports...\n');

const srcDir = path.join(process.cwd(), 'src');
const reactFiles = findReactFiles(srcDir);

let fixedCount = 0;
let totalIconsAdded = 0;

console.log(`Found ${reactFiles.length} React component files\n`);

reactFiles.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  const result = fixLucideImports(file);
  
  if (result.success) {
    fixedCount++;
    totalIconsAdded += result.addedIcons.length;
    console.log(`✅ Fixed ${relativePath}`);
    console.log(`   Added icons: ${result.addedIcons.join(', ')}`);
    console.log(`   Total icons: ${result.totalIcons}`);
    console.log('');
  } else if (result.error !== 'No lucide-react imports found' && 
             result.error !== 'No Lucide icons found in usage' && 
             result.error !== 'All icons already imported' && 
             result.error !== 'No changes needed') {
    console.log(`❌ Error fixing ${relativePath}: ${result.error}`);
  }
});

console.log(`\n🎯 Summary:`);
console.log(`✅ Fixed ${fixedCount} files`);
console.log(`🔧 Added ${totalIconsAdded} missing icon imports`);

if (fixedCount > 0) {
  console.log('\n🔄 Please restart your development server to see the changes.');
  console.log('💡 Lucide React icon import errors should now be resolved!');
} else {
  console.log('\n✅ No Lucide React icon import issues found.');
}