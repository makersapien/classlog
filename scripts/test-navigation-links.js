// Test script to verify navigation links are working
// This script checks that all navigation pages exist and are accessible

console.log('🧪 Testing Navigation Links...');
console.log('=' .repeat(60));

// Navigation links to test
const navigationLinks = [
  {
    emoji: '🏠',
    label: 'Dashboard',
    path: '/dashboard/teacher',
    file: 'src/app/dashboard/teacher/page.tsx'
  },
  {
    emoji: '📚',
    label: 'My Classes',
    path: '/dashboard/teacher/classes',
    file: 'src/app/dashboard/teacher/classes/page.tsx'
  },
  {
    emoji: '👥',
    label: 'Students',
    path: '/dashboard/teacher/students',
    file: 'src/app/dashboard/teacher/students/page.tsx'
  },
  {
    emoji: '📝',
    label: 'Class Logs',
    path: '/dashboard/teacher/classes',
    file: 'src/app/dashboard/teacher/classes/page.tsx'
  },
  {
    emoji: '💰',
    label: 'Payments',
    path: '/dashboard/teacher/payments',
    file: 'src/app/dashboard/teacher/payments/page.tsx'
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test 1: Check if page files exist
function testPageFilesExist() {
  console.log('\\n1️⃣ Testing Page Files Existence...');
  
  const fs = require('fs');
  const path = require('path');
  
  for (const link of navigationLinks) {
    try {
      const filePath = path.join(process.cwd(), link.file);
      
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${link.emoji} ${link.label}: File exists`);
        testResults.passed++;
      } else {
        console.log(`   ❌ ${link.emoji} ${link.label}: File missing - ${link.file}`);
        testResults.failed++;
        testResults.errors.push(`${link.label} file missing: ${link.file}`);
      }
    } catch (error) {
      console.log(`   ❌ ${link.emoji} ${link.label}: Error checking file - ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${link.label} file check error: ${error.message}`);
    }
  }
}

// Test 2: Check DashboardLayout navigation configuration
function testDashboardLayoutConfig() {
  console.log('\\n2️⃣ Testing DashboardLayout Navigation Config...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const layoutPath = path.join(process.cwd(), 'src/app/dashboard/DashboardLayout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Check if navigation items are properly configured
    const expectedPaths = [
      '/dashboard/teacher/classes',
      '/dashboard/teacher/students', 
      '/dashboard/teacher/payments'
    ];
    
    let configValid = true;
    
    for (const expectedPath of expectedPaths) {
      if (layoutContent.includes(expectedPath)) {
        console.log(`   ✅ Navigation path configured: ${expectedPath}`);
      } else {
        console.log(`   ❌ Navigation path missing: ${expectedPath}`);
        configValid = false;
        testResults.errors.push(`Navigation path missing: ${expectedPath}`);
      }
    }
    
    if (configValid) {
      console.log('   ✅ DashboardLayout navigation properly configured');
      testResults.passed++;
    } else {
      console.log('   ❌ DashboardLayout navigation configuration incomplete');
      testResults.failed++;
    }
    
  } catch (error) {
    console.log('   ❌ DashboardLayout config test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`DashboardLayout config test error: ${error.message}`);
  }
}

// Test 3: Check for potential routing conflicts
function testRoutingConflicts() {
  console.log('\\n3️⃣ Testing for Routing Conflicts...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if pages have conflicting authentication or layout wrapping
    const pagesToCheck = [
      'src/app/dashboard/teacher/classes/page.tsx',
      'src/app/dashboard/teacher/students/page.tsx',
      'src/app/dashboard/teacher/payments/page.tsx'
    ];
    
    let conflictsFound = false;
    
    for (const pagePath of pagesToCheck) {
      try {
        const fullPath = path.join(process.cwd(), pagePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for potential conflicts
        const hasOwnAuth = content.includes('useEffect') && content.includes('auth');
        const hasOwnLayout = content.includes('DashboardLayout');
        const hasRouter = content.includes('useRouter');
        
        if (hasOwnAuth && hasOwnLayout) {
          console.log(`   ⚠️ ${pagePath}: Has own auth + layout (potential conflict)`);
          conflictsFound = true;
        } else if (hasOwnLayout) {
          console.log(`   ✅ ${pagePath}: Uses DashboardLayout (good)`);
        } else {
          console.log(`   ✅ ${pagePath}: No layout conflicts`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking ${pagePath}: ${error.message}`);
        conflictsFound = true;
      }
    }
    
    if (!conflictsFound) {
      console.log('   ✅ No major routing conflicts detected');
      testResults.passed++;
    } else {
      console.log('   ⚠️ Potential routing conflicts detected');
      testResults.failed++;
      testResults.errors.push('Potential routing conflicts in page components');
    }
    
  } catch (error) {
    console.log('   ❌ Routing conflict test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Routing conflict test error: ${error.message}`);
  }
}

// Test 4: Check component dependencies
function testComponentDependencies() {
  console.log('\\n4️⃣ Testing Component Dependencies...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if required components exist
    const requiredComponents = [
      'src/components/MyClassesView.tsx',
      'src/components/StudentDetailsModal.tsx',
      'src/app/dashboard/DashboardLayout.tsx'
    ];
    
    let dependenciesValid = true;
    
    for (const component of requiredComponents) {
      const componentPath = path.join(process.cwd(), component);
      
      if (fs.existsSync(componentPath)) {
        console.log(`   ✅ Required component exists: ${component}`);
      } else {
        console.log(`   ❌ Missing required component: ${component}`);
        dependenciesValid = false;
        testResults.errors.push(`Missing component: ${component}`);
      }
    }
    
    if (dependenciesValid) {
      console.log('   ✅ All required components exist');
      testResults.passed++;
    } else {
      console.log('   ❌ Some required components are missing');
      testResults.failed++;
    }
    
  } catch (error) {
    console.log('   ❌ Component dependency test error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Component dependency test error: ${error.message}`);
  }
}

// Main test function
function runNavigationTests() {
  console.log('🧪 Starting Navigation Links Tests...');
  console.log('=' .repeat(60));
  
  try {
    // Run all tests
    testPageFilesExist();
    testDashboardLayoutConfig();
    testRoutingConflicts();
    testComponentDependencies();
    
    // Print results
    console.log('\\n' + '='.repeat(60));
    console.log('🏁 Navigation Links Test Results');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\\n❌ Issues Found:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\\n🎉 All navigation links should be working!');
      console.log('\\n📋 Navigation Summary:');
      navigationLinks.forEach(link => {
        console.log(`   ${link.emoji} ${link.label} → ${link.path}`);
      });
    } else {
      console.log('\\n⚠️ Some navigation issues found. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }
}

// Run the tests
runNavigationTests();