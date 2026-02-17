// Test script to verify authentication navigation fixes
// This script checks that pages no longer have conflicting authentication

console.log('🧪 Testing Authentication Navigation Fixes...');
console.log('=' .repeat(60));

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Pages to test for authentication conflicts
const pagesToTest = [
  {
    name: 'Classes Page',
    path: 'src/app/dashboard/teacher/classes/page.tsx',
    shouldHaveAuth: false,
    shouldUseDashboardLayout: false,
    shouldUseUserContext: true
  },
  {
    name: 'Payments Page', 
    path: 'src/app/dashboard/teacher/payments/page.tsx',
    shouldHaveAuth: false,
    shouldUseDashboardLayout: false,
    shouldUseUserContext: false
  },
  {
    name: 'Students Page',
    path: 'src/app/dashboard/teacher/students/page.tsx',
    shouldHaveAuth: false, // This one was already working
    shouldUseDashboardLayout: false,
    shouldUseUserContext: false
  },
  {
    name: 'Main Teacher Page',
    path: 'src/app/dashboard/teacher/page.tsx',
    shouldHaveAuth: false,
    shouldUseDashboardLayout: false,
    shouldUseUserContext: false
  }
];

// Test 1: Check for authentication conflicts
function testAuthenticationConflicts() {
  console.log('\\n1️⃣ Testing Authentication Conflicts...');
  
  let conflictsFound = false;
  
  for (const page of pagesToTest) {
    try {
      const filePath = path.join(process.cwd(), page.path);
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ❌ ${page.name}: File not found`);
        testResults.failed++;
        testResults.errors.push(`${page.name} file not found`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for problematic patterns
      const hasCreateClient = content.includes('createClientComponentClient');
      const hasAuthGetSession = content.includes('auth.getSession');
      const hasRouterPush = content.includes('router.push(\'/\')') || content.includes('router.push(\'/auth');
      const hasOwnUserState = content.includes('useState<User') && content.includes('setUser');
      const hasAuthUseEffect = content.includes('useEffect') && content.includes('auth') && content.includes('session');
      const hasNestedDashboardLayout = content.includes('<DashboardLayout') && content.includes('user={');
      
      // Check for good patterns
      const usesUserContext = content.includes('useUser()') || content.includes('useUser');
      
      let hasConflicts = false;
      let issues = [];
      
      if (hasCreateClient) {
        issues.push('Uses createClientComponentClient (should use DashboardLayout auth)');
        hasConflicts = true;
      }
      
      if (hasAuthGetSession) {
        issues.push('Has auth.getSession (duplicate auth logic)');
        hasConflicts = true;
      }
      
      if (hasRouterPush && (content.includes('router.push(\'/\')') || content.includes('auth/login'))) {
        issues.push('Has auth redirect logic (should be handled by DashboardLayout)');
        hasConflicts = true;
      }
      
      if (hasOwnUserState) {
        issues.push('Manages own user state (should use context)');
        hasConflicts = true;
      }
      
      if (hasAuthUseEffect) {
        issues.push('Has authentication useEffect (duplicate logic)');
        hasConflicts = true;
      }
      
      if (hasNestedDashboardLayout) {
        issues.push('Wraps content in DashboardLayout (should be handled by parent)');
        hasConflicts = true;
      }
      
      // Report results
      if (hasConflicts) {
        console.log(`   ❌ ${page.name}: Authentication conflicts found`);
        issues.forEach(issue => console.log(`      - ${issue}`));
        conflictsFound = true;
        testResults.errors.push(`${page.name}: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ ${page.name}: No authentication conflicts`);
        
        // Check for expected patterns
        if (page.shouldUseUserContext && usesUserContext) {
          console.log(`      ✅ Uses user context correctly`);
        } else if (page.shouldUseUserContext && !usesUserContext) {
          console.log(`      ⚠️ Should use user context but doesn't`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ${page.name}: Error reading file - ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${page.name}: Error reading file`);
      conflictsFound = true;
    }
  }
  
  if (!conflictsFound) {
    console.log('   ✅ No authentication conflicts detected');
    testResults.passed++;
  } else {
    console.log('   ❌ Authentication conflicts found');
    testResults.failed++;
  }
}

// Test 2: Check DashboardLayout user context
function testUserContextImplementation() {
  console.log('\\n2️⃣ Testing User Context Implementation...');
  
  try {
    const layoutPath = path.join(process.cwd(), 'src/app/dashboard/DashboardLayout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    const hasUserContext = layoutContent.includes('UserContext');
    const hasUseUserHook = layoutContent.includes('useUser');
    const hasContextProvider = layoutContent.includes('UserContext.Provider');
    const hasCreateContext = layoutContent.includes('createContext');
    
    let contextValid = true;
    let issues = [];
    
    if (!hasCreateContext) {
      issues.push('Missing createContext import/usage');
      contextValid = false;
    }
    
    if (!hasUserContext) {
      issues.push('Missing UserContext definition');
      contextValid = false;
    }
    
    if (!hasUseUserHook) {
      issues.push('Missing useUser hook');
      contextValid = false;
    }
    
    if (!hasContextProvider) {
      issues.push('Missing UserContext.Provider wrapper');
      contextValid = false;
    }
    
    if (contextValid) {
      console.log('   ✅ User context properly implemented');
      testResults.passed++;
    } else {
      console.log('   ❌ User context implementation issues:');
      issues.forEach(issue => console.log(`      - ${issue}`));
      testResults.failed++;
      testResults.errors.push(`User context issues: ${issues.join(', ')}`);
    }
    
  } catch (error) {
    console.log('   ❌ Error checking DashboardLayout:', error.message);
    testResults.failed++;
    testResults.errors.push(`DashboardLayout check error: ${error.message}`);
  }
}

// Test 3: Check for proper component structure
function testComponentStructure() {
  console.log('\\n3️⃣ Testing Component Structure...');
  
  let structureValid = true;
  
  // Check classes page specifically
  try {
    const classesPath = path.join(process.cwd(), 'src/app/dashboard/teacher/classes/page.tsx');
    const classesContent = fs.readFileSync(classesPath, 'utf8');
    
    const hasMyClassesView = classesContent.includes('MyClassesView');
    const passesTeacherId = classesContent.includes('teacherId={user.id}');
    const usesUserHook = classesContent.includes('useUser()');
    
    if (hasMyClassesView && passesTeacherId && usesUserHook) {
      console.log('   ✅ Classes page: Proper component structure');
    } else {
      console.log('   ❌ Classes page: Structure issues');
      if (!hasMyClassesView) console.log('      - Missing MyClassesView component');
      if (!passesTeacherId) console.log('      - Not passing teacherId prop');
      if (!usesUserHook) console.log('      - Not using useUser hook');
      structureValid = false;
      testResults.errors.push('Classes page structure issues');
    }
    
  } catch (error) {
    console.log('   ❌ Error checking classes page structure:', error.message);
    structureValid = false;
  }
  
  // Check payments page
  try {
    const paymentsPath = path.join(process.cwd(), 'src/app/dashboard/teacher/payments/page.tsx');
    const paymentsContent = fs.readFileSync(paymentsPath, 'utf8');
    
    const hasPaymentCreditsPage = paymentsContent.includes('PaymentCreditsPage');
    const isSimple = paymentsContent.split('\\n').length < 15; // Should be a simple component
    
    if (hasPaymentCreditsPage && isSimple) {
      console.log('   ✅ Payments page: Proper component structure');
    } else {
      console.log('   ❌ Payments page: Structure issues');
      if (!hasPaymentCreditsPage) console.log('      - Missing PaymentCreditsPage component');
      if (!isSimple) console.log('      - Too complex (should be simple wrapper)');
      structureValid = false;
      testResults.errors.push('Payments page structure issues');
    }
    
  } catch (error) {
    console.log('   ❌ Error checking payments page structure:', error.message);
    structureValid = false;
  }
  
  if (structureValid) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// Main test function
function runAuthNavigationTests() {
  console.log('🧪 Starting Authentication Navigation Fix Tests...');
  console.log('=' .repeat(60));
  
  try {
    // Run all tests
    testAuthenticationConflicts();
    testUserContextImplementation();
    testComponentStructure();
    
    // Print results
    console.log('\\n' + '='.repeat(60));
    console.log('🏁 Authentication Navigation Fix Test Results');
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
      console.log('\\n🎉 All authentication navigation fixes are working!');
      console.log('\\n✨ Key Fixes Applied:');
      console.log('   • Removed duplicate authentication logic from individual pages');
      console.log('   • Added user context to DashboardLayout for sharing user data');
      console.log('   • Simplified page components to focus on content only');
      console.log('   • Fixed authentication conflicts that caused logout issues');
      console.log('\\n🚀 Navigation should now work without logging users out!');
    } else {
      console.log('\\n⚠️ Some authentication issues remain. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }
}

// Run the tests
runAuthNavigationTests();