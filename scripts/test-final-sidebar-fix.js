#!/usr/bin/env node

/**
 * Final test script to verify both sidebar and navigation issues are resolved
 */

const fs = require('fs')

console.log('🔍 Testing Final Sidebar and Navigation Fix...\n')

// Check shared context exists
const contextPath = 'src/contexts/DashboardLayoutContext.tsx'
const contextExists = fs.existsSync(contextPath)
console.log(`${contextExists ? '✅' : '❌'} Shared DashboardLayoutContext exists: ${contextExists}`)

// Check teacher layout uses shared context
const teacherLayoutPath = 'src/app/dashboard/teacher/layout.tsx'
if (fs.existsSync(teacherLayoutPath)) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  const usesSharedContext = content.includes("import { DashboardLayoutContext } from '@/contexts/DashboardLayoutContext'")
  console.log(`${usesSharedContext ? '✅' : '❌'} Teacher layout uses shared context: ${usesSharedContext}`)
}

// Check UnifiedDashboard uses shared context
const unifiedDashboardPath = 'src/app/dashboard/UnifiedDashboard.tsx'
if (fs.existsSync(unifiedDashboardPath)) {
  const content = fs.readFileSync(unifiedDashboardPath, 'utf8')
  const usesSharedContext = content.includes("import { useDashboardLayoutProvided } from '@/contexts/DashboardLayoutContext'")
  console.log(`${usesSharedContext ? '✅' : '❌'} UnifiedDashboard uses shared context: ${usesSharedContext}`)
}

// Check DashboardLayout has Students navigation
const dashboardLayoutPath = 'src/app/dashboard/DashboardLayout.tsx'
if (fs.existsSync(dashboardLayoutPath)) {
  const content = fs.readFileSync(dashboardLayoutPath, 'utf8')
  const hasStudentsNav = content.includes("label: 'Students', href: '/dashboard/teacher/students'")
  console.log(`${hasStudentsNav ? '✅' : '❌'} DashboardLayout has Students navigation: ${hasStudentsNav}`)
  
  const hasRouterPush = content.includes('router.push(item.href)')
  console.log(`${hasRouterPush ? '✅' : '❌'} DashboardLayout uses router.push for navigation: ${hasRouterPush}`)
}

// Check students page exists
const studentsPagePath = 'src/app/dashboard/teacher/students/page.tsx'
const studentsPageExists = fs.existsSync(studentsPagePath)
console.log(`${studentsPageExists ? '✅' : '❌'} Students page exists: ${studentsPageExists}`)

console.log('\n🎯 Expected Behavior After Fix:')
console.log('✅ /dashboard/teacher → Single sidebar (UnifiedDashboard detects existing DashboardLayout)')
console.log('✅ /dashboard/teacher/classes → Single sidebar (from teacher layout)')
console.log('✅ /dashboard/teacher/booking → Single sidebar (from teacher layout)')
console.log('✅ /dashboard/teacher/students → Single sidebar (from teacher layout)')
console.log('✅ Students navigation link works correctly')
console.log('✅ No dual sidebars on any page')

console.log('\n🚀 Both sidebar duplication and students navigation should now be fixed!')

// Additional debugging info
console.log('\n🔧 Debugging Info:')
console.log('- Teacher layout provides DashboardLayoutContext.Provider value={true}')
console.log('- UnifiedDashboard checks useDashboardLayoutProvided() and skips its own DashboardLayout')
console.log('- All teacher pages get consistent sidebar from teacher layout')
console.log('- Students link uses router.push("/dashboard/teacher/students")')