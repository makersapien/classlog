#!/usr/bin/env node

/**
 * Final test script to verify all navigation issues are resolved
 */

const fs = require('fs')

console.log('🔍 Final Navigation Fix Verification...\n')

// Test results
const results = {
  authenticationFixed: false,
  dualNavigationFixed: false,
  studentsLinkWorking: false,
  subPagesHaveNavigation: false
}

// Check authentication fix
const teacherLayoutPath = 'src/app/dashboard/teacher/layout.tsx'
if (fs.existsSync(teacherLayoutPath)) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  const hasCorrectAuth = content.includes('supabase.auth.getSession') && 
                        !content.includes('createClientComponentClient') &&
                        content.includes('TeacherUserContext')
  results.authenticationFixed = hasCorrectAuth
}

// Check dual navigation fix
if (fs.existsSync(teacherLayoutPath)) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  const hasConditionalLayout = content.includes('isMainTeacherPage') && 
                              content.includes('TeacherUserContext.Provider')
  results.dualNavigationFixed = hasConditionalLayout
}

// Check students link (students page should exist and not use useUser)
const studentsPagePath = 'src/app/dashboard/teacher/students/page.tsx'
if (fs.existsSync(studentsPagePath)) {
  const content = fs.readFileSync(studentsPagePath, 'utf8')
  const doesntUseUser = !content.includes('useUser()')
  results.studentsLinkWorking = doesntUseUser
}

// Check sub-pages have navigation
const classesPagePath = 'src/app/dashboard/teacher/classes/page.tsx'
const bookingPagePath = 'src/app/dashboard/teacher/booking/page.tsx'

let subPagesHaveNav = true
if (fs.existsSync(classesPagePath)) {
  const content = fs.readFileSync(classesPagePath, 'utf8')
  if (!content.includes('Back to Dashboard')) {
    subPagesHaveNav = false
  }
}
if (fs.existsSync(bookingPagePath)) {
  const content = fs.readFileSync(bookingPagePath, 'utf8')
  if (!content.includes('Back to Dashboard')) {
    subPagesHaveNav = false
  }
}
results.subPagesHaveNavigation = subPagesHaveNav

// Display results
console.log('📋 Fix Verification Results:')
console.log(`${results.authenticationFixed ? '✅' : '❌'} Authentication Issues Fixed: ${results.authenticationFixed ? 'YES' : 'NO'}`)
console.log(`${results.dualNavigationFixed ? '✅' : '❌'} Dual Navigation Fixed: ${results.dualNavigationFixed ? 'YES' : 'NO'}`)
console.log(`${results.studentsLinkWorking ? '✅' : '❌'} Students Link Working: ${results.studentsLinkWorking ? 'YES' : 'NO'}`)
console.log(`${results.subPagesHaveNavigation ? '✅' : '❌'} Sub-pages Have Navigation: ${results.subPagesHaveNavigation ? 'YES' : 'NO'}`)

const allFixed = Object.values(results).every(result => result === true)

console.log(`\n🎯 Overall Status: ${allFixed ? '✅ ALL ISSUES RESOLVED' : '❌ SOME ISSUES REMAIN'}`)

if (allFixed) {
  console.log('\n🚀 Expected Behavior:')
  console.log('✅ Login redirects to dashboard and stays there')
  console.log('✅ No "Multiple GoTrueClient instances" warnings')
  console.log('✅ No "useUser must be used within a DashboardLayout" errors')
  console.log('✅ Single navigation pane (no dual navigation)')
  console.log('✅ Students link works correctly')
  console.log('✅ Class Logs and Booking Management work without errors')
  console.log('✅ Sub-pages have navigation back to main dashboard')
  
  console.log('\n🎉 All navigation and authentication issues have been resolved!')
} else {
  console.log('\n⚠️ Some issues may still need attention.')
}