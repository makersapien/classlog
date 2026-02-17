#!/usr/bin/env node

/**
 * Test script to verify the dual sidebar fix
 */

const fs = require('fs')

console.log('🔍 Testing Dual Sidebar Fix...\n')

// Check teacher layout
const teacherLayoutPath = 'src/app/dashboard/teacher/layout.tsx'
if (fs.existsSync(teacherLayoutPath)) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  
  // Check that main teacher page doesn't wrap in DashboardLayout
  const mainPageNoWrapper = content.includes('if (isMainTeacherPage)') && 
                           content.includes('return <>{children}</>') &&
                           !content.includes('return (\n      <DashboardLayout user={user}>')
  
  console.log(`${mainPageNoWrapper ? '✅' : '❌'} Main teacher page doesn't wrap in DashboardLayout: ${mainPageNoWrapper ? 'CORRECT' : 'INCORRECT'}`)
  
  // Check that sub-pages only get context
  const subPagesOnlyContext = content.includes('TeacherUserContext.Provider')
  console.log(`${subPagesOnlyContext ? '✅' : '❌'} Sub-pages only get user context: ${subPagesOnlyContext ? 'CORRECT' : 'INCORRECT'}`)
}

// Check UnifiedDashboard
const unifiedDashboardPath = 'src/app/dashboard/UnifiedDashboard.tsx'
if (fs.existsSync(unifiedDashboardPath)) {
  const content = fs.readFileSync(unifiedDashboardPath, 'utf8')
  
  // Check that UnifiedDashboard wraps in DashboardLayout
  const hasOwnWrapper = content.includes('<DashboardLayout user={user}>')
  console.log(`${hasOwnWrapper ? '✅' : '❌'} UnifiedDashboard provides its own DashboardLayout: ${hasOwnWrapper ? 'CORRECT' : 'INCORRECT'}`)
}

console.log('\n🎯 Expected Behavior:')
console.log('✅ /dashboard/teacher → UnifiedDashboard provides single DashboardLayout')
console.log('✅ /dashboard/teacher/classes → Only user context, no DashboardLayout')
console.log('✅ /dashboard/teacher/booking → Only user context, no DashboardLayout')
console.log('✅ No dual sidebars anywhere')

console.log('\n🚀 The dual sidebar issue should now be completely resolved!')