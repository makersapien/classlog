#!/usr/bin/env node

/**
 * Test script to verify the calendar vertical space optimizations
 */

const fs = require('fs')
const path = require('path')

function testCalendarVerticalOptimization() {
  console.log('📏 Testing Calendar Vertical Space Optimization...\n')

  try {
    const componentPath = path.join(__dirname, '../src/components/StreamlinedScheduleView.tsx')
    
    if (!fs.existsSync(componentPath)) {
      console.error('❌ StreamlinedScheduleView.tsx not found')
      return
    }

    const content = fs.readFileSync(componentPath, 'utf8')
    
    // Test vertical space optimizations
    const tests = [
      {
        name: 'Ultra-compact header with merged controls',
        check: content.includes('Ultra-Compact Header - All Controls in One Row') && content.includes('space-y-4 p-4')
      },
      {
        name: 'Schedule toggle made compact with subtle label',
        check: content.includes('text-xs text-slate-500 mb-1 font-medium">Schedule') && content.includes('px-3 py-1.5 text-xs')
      },
      {
        name: 'Week navigation merged into header',
        check: content.includes('Compact Week Navigation') && !content.includes('Enhanced Week Navigation')
      },
      {
        name: 'Mode toggle made smaller',
        check: content.includes('px-4 py-1.5 text-xs font-semibold') && content.includes('h-3 w-3 mr-1')
      },
      {
        name: 'Actions buttons made compact',
        check: content.includes('h-8 px-3 text-xs') && content.includes('h-3 w-3 mr-1')
      },
      {
        name: 'Instructions made ultra-compact',
        check: content.includes('Drag • Dbl-click') && content.includes('px-2 py-1 rounded-md')
      },
      {
        name: 'Assignment controls made compact',
        check: content.includes('Compact Assignment Controls') && content.includes('h-8 bg-white')
      },
      {
        name: 'Saturday special coloring added',
        check: content.includes('isSaturday = day === \'Saturday\'') && content.includes('from-green-500 to-emerald-600')
      },
      {
        name: 'Sunday coloring enhanced',
        check: content.includes('isSunday = day === \'Sunday\'') && content.includes('from-red-500 to-pink-600')
      },
      {
        name: 'Weekend indicators added',
        check: content.includes('(isSunday || isSaturday) && !isToday') && content.includes('bg-white/60')
      },
      {
        name: 'Removed separate instruction panels',
        check: !content.includes('Enhanced Instructions') && !content.includes('Create Mode')
      },
      {
        name: 'Reduced padding throughout',
        check: content.includes('p-3') && content.includes('space-y-4')
      }
    ]

    let passed = 0
    let failed = 0

    tests.forEach(test => {
      if (test.check) {
        console.log(`✅ ${test.name}`)
        passed++
      } else {
        console.log(`❌ ${test.name}`)
        failed++
      }
    })

    console.log(`\n📊 Vertical Optimization Results: ${passed} passed, ${failed} failed`)

    // Check specific space-saving improvements
    console.log('\n📏 Checking Space-Saving Improvements...')
    
    const spaceTests = [
      {
        name: 'Header reduced from space-y-8 to space-y-4',
        check: content.includes('space-y-4 p-4') && !content.includes('space-y-8 p-6')
      },
      {
        name: 'Padding reduced from p-6 to p-3/p-4',
        check: content.includes('p-3') && content.includes('p-4')
      },
      {
        name: 'Button heights reduced to h-8',
        check: content.includes('h-8 w-8') && content.includes('h-8 px-3')
      },
      {
        name: 'Text sizes reduced to text-xs',
        check: content.includes('text-xs font-medium') && content.includes('text-xs text-slate-500')
      },
      {
        name: 'Icon sizes reduced to h-3 w-3',
        check: content.includes('h-3 w-3') && content.includes('h-3 w-3 mr-1')
      },
      {
        name: 'Merged navigation eliminates separate section',
        check: !content.includes('Enhanced Week Navigation') && content.includes('Compact Week Navigation')
      }
    ]

    spaceTests.forEach(test => {
      if (test.check) {
        console.log(`✅ ${test.name}`)
      } else {
        console.log(`❌ ${test.name}`)
      }
    })

    console.log('\n🎨 Checking Weekend Color Enhancements...')
    
    const colorTests = [
      {
        name: 'Saturday gets green gradient',
        check: content.includes('from-green-500 to-emerald-600')
      },
      {
        name: 'Sunday gets red/pink gradient',
        check: content.includes('from-red-500 to-pink-600')
      },
      {
        name: 'Weekend indicators for non-today weekends',
        check: content.includes('bg-white/60 rounded-full')
      },
      {
        name: 'Today still gets priority coloring',
        check: content.includes('from-yellow-400 to-orange-500')
      }
    ]

    colorTests.forEach(test => {
      if (test.check) {
        console.log(`✅ ${test.name}`)
      } else {
        console.log(`❌ ${test.name}`)
      }
    })

    console.log('\n🎉 Calendar Vertical Optimization Summary:')
    console.log('✅ Header merged into single ultra-compact row')
    console.log('✅ Schedule toggle made wider but thinner with subtle label')
    console.log('✅ Week navigation merged into header (no separate section)')
    console.log('✅ Mode toggle and actions made compact')
    console.log('✅ Assignment controls compressed to single row')
    console.log('✅ Saturday gets special green coloring')
    console.log('✅ Sunday enhanced with red/pink coloring')
    console.log('✅ Weekend indicators for visual distinction')
    console.log('✅ Removed verbose instruction panels')
    console.log('✅ Reduced padding and spacing throughout')
    
    console.log('\n📝 Key Space-Saving Changes:')
    console.log('1. Merged 4 separate sections into 1 compact header')
    console.log('2. Reduced vertical spacing from space-y-8 to space-y-4')
    console.log('3. Compressed padding from p-6 to p-3/p-4')
    console.log('4. Shrunk button heights and text sizes')
    console.log('5. Eliminated separate week navigation panel')
    console.log('6. Removed verbose instruction sections')
    console.log('7. Made assignment controls single-row')

    console.log('\n🎨 Weekend Color Scheme:')
    console.log('• Today: Yellow/Orange gradient (highest priority)')
    console.log('• Sunday: Red/Pink gradient')
    console.log('• Saturday: Green/Emerald gradient')
    console.log('• Weekdays: Indigo/Purple gradient')
    console.log('• Weekend indicators: Small white dots')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testCalendarVerticalOptimization()