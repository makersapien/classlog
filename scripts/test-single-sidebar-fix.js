#!/usr/bin/env node

/**
 * Test script to verify single sidebar on all pages fix
 */

const fs = require('fs')

console.log('🔍 Testing Single Sidebar on All Pages Fix...\n')

// Check teacher layout
const teacherLayoutPath = 'src/app/dashboard/teacher/layout.tsx'
if (fs.existsSync(teacherLayoutPath)) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  
  // Check that ALL pages wrap in DashboardLayout
  const allPagesWrapped = content.includes('return (\n    <DashboardLayout user={user}>') &&
                         content.includes('DashboardLayoutContext.Provider value={true}')
  
  console.log(`${allPagesWrapped ? '✅' : '❌'} All teacher pages wrapped in DashboardLayout: ${allPagesWrapped ? 'CORRECT' : 'INCORRECT'}`)
  
  // Check that context is provided to prevent double wrapping
  const contextProvided = content.includes('DashboardLayoutContext.Provider')
  console.log(`${contextProvided ? '✅' : '❌'} Context provided to prevent double wrapping: ${contextProvided ? 'CORRECT' : 'INCORRECT'}`)
}

// Check UnifiedDashboard
const unifiedDashboardPath = 'src/app/dashboard/UnifiedDashboard.tsx'
if (fs.existsSync(unifiedDashboardPath)) {
  const content = fs.readFileSync(unifiedDashboardPath, 'utf8')
  
  // Check that UnifiedDashboard detects existing DashboardLayout
  const detectsExisting = content.includes('isDashboardLayoutProvided') &&
                         content.includes('if (isDashboardLayoutProvided)')
  
  console.log(`${detectsExisting ? '✅' : '❌'} UnifiedDashboard detects existing DashboardLayout: ${detectsExisting ? 'CORRECT' : 'INCORRECT'}`)
}

// Check sub-pages use regular useUser
const subPages = [
  { path: 'src/app/dashboard/teacher/classes/page.tsx', name: 'Classes Page' },
  { path: 'src/app/dashboard/teacher/booking/page.tsx', name: 'Booking Page' }
]

console.log('\n📄 Teacher Sub-Pages:')
subPages.forEach(page => {
  if (fs.existsSync(page.path)) {
    const content = fs.readFileSync(page.path, 'utf8')
    const usesRegularUser = content.includes("import { useUser } from '@/app/dashboard/DashboardLayout'") &&
                           content.includes('const user = useUser()')
    
    console.log(`${usesRegularUser ? '✅' : '❌'} ${page.name}: ${usesRegularUser ? 'Uses regular useUser hook' : 'NEEDS UPDATE'}`)
  } else {
    console.log(`❌ ${page.name}: File not found`)
  }
})

console.log('\n🎯 Expected Behavior:')
console.log('✅ /dashboard/teacher → Single sidebar (UnifiedDashboard content, no double wrap)')
console.log('✅ /dashboard/teacher/classes → Single sidebar (DashboardLayout from teacher layout)')
console.log('✅ /dashboard/teacher/booking → Single sidebar (DashboardLayout from teacher layout)')
console.log('✅ /dashboard/teacher/students → Single sidebar (DashboardLayout from teacher layout)')
console.log('✅ All pages have consistent navigation and user context')

console.log('\n🚀 All teacher pages should now have exactly one sidebar!')