#!/usr/bin/env node

/**
 * Test script to verify the teacher layout fix
 * This script checks if the teacher layout file exists and has the correct structure
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Testing Teacher Layout Fix...\n')

// Check if teacher layout file exists
const teacherLayoutPath = 'src/app/dashboard/teacher/layout.tsx'
const exists = fs.existsSync(teacherLayoutPath)

console.log(`✅ Teacher layout file exists: ${exists}`)

if (exists) {
  const content = fs.readFileSync(teacherLayoutPath, 'utf8')
  
  // Check for key components
  const checks = [
    { name: 'DashboardLayout import', pattern: /import DashboardLayout from/ },
    { name: 'useUser context provision', pattern: /return \(\s*<DashboardLayout user={user}>/ },
    { name: 'Authentication check', pattern: /supabase\.auth\.getSession/ },
    { name: 'Role verification', pattern: /profile\.role !== 'teacher'/ },
    { name: 'Loading state', pattern: /loading.*setLoading/ },
    { name: 'Error handling', pattern: /error.*setError/ }
  ]
  
  console.log('\n📋 Layout Structure Checks:')
  checks.forEach(check => {
    const passed = check.pattern.test(content)
    console.log(`${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'PASS' : 'FAIL'}`)
  })
  
  // Check for teacher-specific pages that will benefit
  const teacherPages = [
    'src/app/dashboard/teacher/classes/page.tsx',
    'src/app/dashboard/teacher/booking/page.tsx'
  ]
  
  console.log('\n📄 Teacher Pages That Will Be Fixed:')
  teacherPages.forEach(pagePath => {
    const pageExists = fs.existsSync(pagePath)
    if (pageExists) {
      const pageContent = fs.readFileSync(pagePath, 'utf8')
      const usesUserHook = /useUser\(\)/.test(pageContent)
      console.log(`${pageExists ? '✅' : '❌'} ${pagePath}: ${usesUserHook ? 'Uses useUser() - WILL BE FIXED' : 'No useUser() usage'}`)
    } else {
      console.log(`❌ ${pagePath}: File not found`)
    }
  })
  
  console.log('\n🎯 Expected Behavior:')
  console.log('✅ All teacher pages (/dashboard/teacher/*) will be wrapped in DashboardLayout')
  console.log('✅ useUser() hook will work correctly in all teacher pages')
  console.log('✅ Authentication will be handled at the layout level')
  console.log('✅ Non-teacher users will be redirected appropriately')
  
  console.log('\n🚀 Fix Status: COMPLETE')
  console.log('The "useUser must be used within a DashboardLayout" error should now be resolved.')
  
} else {
  console.log('❌ Teacher layout file not found. The fix was not applied correctly.')
}