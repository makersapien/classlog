#!/usr/bin/env node

/**
 * 🧪 ClassLogger Start/End Class Bridge Test
 * Tests the complete bridge communication between extension and webapp
 */

console.log('🧪 ClassLogger Start/End Class Bridge Test')
console.log('==========================================')

// Test data
const testData = {
  startClass: {
    source: 'classlogger-extension',
    type: 'START_CLASS_REQUEST',
    requestId: 'test-' + Date.now(),
    data: {
      meetUrl: 'https://meet.google.com/test-abc-def-' + Date.now(),
      platform: 'Google Meet',
      title: 'Test Class - Bridge Test ' + new Date().toLocaleTimeString()
    }
  },
  endClass: {
    source: 'classlogger-extension',
    type: 'END_CLASS_REQUEST',
    requestId: 'test-end-' + Date.now(),
    data: {
      class_log_id: null // Will be filled from start class response
    }
  }
}

console.log('\n📋 Test Instructions:')
console.log('1. Open classlogger.com in your browser')
console.log('2. Make sure you are logged in')
console.log('3. Open browser console (F12)')
console.log('4. Copy and paste the test commands below')
console.log('5. Watch for success/error messages')

console.log('\n🚀 STEP 1: Test Bridge Availability')
console.log('Copy this into browser console:')
console.log('─'.repeat(50))
console.log(`console.log('Bridge loaded:', !!window.extensionBridge);`)

console.log('\n🎯 STEP 2: Test Start Class')
console.log('Copy this into browser console:')
console.log('─'.repeat(50))
console.log(`
// Test Start Class
window.postMessage(${JSON.stringify(testData.startClass, null, 2)}, '*');

// Listen for response
window.addEventListener('message', (event) => {
  if (event.data?.type === 'START_CLASS_RESPONSE') {
    console.log('✅ Start Class Response:', event.data);
    
    // Store class_log_id for end class test
    window.testClassLogId = event.data.class_log_id || event.data.id;
    console.log('📝 Stored class_log_id for end test:', window.testClassLogId);
  }
});
`)

console.log('\n🛑 STEP 3: Test End Class (run after start class succeeds)')
console.log('Copy this into browser console:')
console.log('─'.repeat(50))
console.log(`
// Test End Class (use stored class_log_id)
if (window.testClassLogId) {
  window.postMessage({
    source: 'classlogger-extension',
    type: 'END_CLASS_REQUEST',
    requestId: 'test-end-${Date.now()}',
    data: {
      class_log_id: window.testClassLogId
    }
  }, '*');
  
  // Listen for end class response
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'END_CLASS_RESPONSE') {
      console.log('✅ End Class Response:', event.data);
    }
  });
} else {
  console.error('❌ No class_log_id found. Run start class test first.');
}
`)

console.log('\n🔍 STEP 4: Check Console Output')
console.log('Look for these messages in browser console:')
console.log('✅ "🔄 Extension requesting to start class..."')
console.log('✅ "✅ Start class response sent: true"')
console.log('✅ "🔄 Extension requesting to end class..."')
console.log('✅ "✅ End class response sent: true"')

console.log('\n🚨 Troubleshooting:')
console.log('If you see CORS errors:')
console.log('- Make sure you\'re testing on classlogger.com (not localhost)')
console.log('- Check that API endpoints have proper CORS headers')
console.log('- Verify authentication is working')

console.log('\nIf bridge is not loaded:')
console.log('- Check that ExtensionBridge component is in layout.tsx')
console.log('- Verify no JavaScript errors on page load')
console.log('- Refresh the page and try again')

console.log('\n📊 Expected Flow:')
console.log('1. Bridge receives START_CLASS_REQUEST')
console.log('2. Bridge calls /api/extension/start-class')
console.log('3. API creates/finds class log')
console.log('4. Bridge sends START_CLASS_RESPONSE with class_log_id')
console.log('5. Bridge receives END_CLASS_REQUEST with class_log_id')
console.log('6. Bridge calls /api/extension/end-class')
console.log('7. API ends class and calculates duration')
console.log('8. Bridge sends END_CLASS_RESPONSE with success')

console.log('\n🎉 Success Criteria:')
console.log('✅ Both requests return success: true')
console.log('✅ Start class returns valid class_log_id')
console.log('✅ End class accepts the class_log_id')
console.log('✅ No CORS errors in console')
console.log('✅ Class appears in dashboard with correct duration')

console.log('\n' + '='.repeat(50))
console.log('Ready to test! Open classlogger.com and run the commands above.')