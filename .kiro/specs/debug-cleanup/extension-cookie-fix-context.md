# Chrome Extension Cookie Access Fix - Complete Context

## 🔍 **Problem Diagnosis**

**Issue**: Chrome extension shows "❌ No auth cookie found" when trying to authenticate with ClassLogger.

**Root Cause**: Extension permissions issue - the extension cannot access cookies from localhost:3000.

**Status**: ✅ ClassLogger backend is working correctly - cookies ARE being created during login.

## 🍪 **Confirmed Working Cookies**

The following cookies are successfully created by ClassLogger during login:

1. **`classlogger_auth`** - JWT token (main authentication)
2. **`classlogger_extension`** - User data in JSON format  
3. **`classlogger_teacher_id`** - Simple teacher ID for quick access

**Cookie Settings**:
```javascript
// Main auth cookie
{
  name: 'classlogger_auth',
  httpOnly: false,        // ✅ Extensions can access
  secure: false,          // ✅ Works in development
  sameSite: 'lax',        // ✅ Good for same-site requests
  path: '/',
  maxAge: 604800          // 7 days
}

// Extension-friendly cookie
{
  name: 'classlogger_extension', 
  httpOnly: false,        // ✅ Extensions can access
  secure: false,          // ✅ Works in development  
  sameSite: 'none',       // ✅ Good for cross-origin (extensions)
  path: '/',
  maxAge: 604800          // 7 days
}
```

## 🔧 **Extension Manifest Fix**

Your extension's `manifest.json` MUST include these permissions:

```json
{
  "manifest_version": 3,
  "name": "ClassLogger Extension",
  "version": "1.0",
  "permissions": [
    "cookies",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://your-production-domain.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

## 🔑 **Cookie Access Implementation**

### **Method 1: Chrome Extension Cookie API (Recommended)**

```javascript
// In background.js or content script
async function getAuthCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({
      domain: 'localhost'
    }, (cookies) => {
      const authCookie = cookies.find(c => c.name === 'classlogger_auth');
      const extensionCookie = cookies.find(c => c.name === 'classlogger_extension');
      const teacherIdCookie = cookies.find(c => c.name === 'classlogger_teacher_id');
      
      console.log('🍪 Cookies found:', {
        auth: authCookie ? 'Found' : 'Missing',
        extension: extensionCookie ? 'Found' : 'Missing', 
        teacherId: teacherIdCookie ? 'Found' : 'Missing'
      });
      
      resolve({
        authToken: authCookie?.value,
        extensionData: extensionCookie?.value,
        teacherId: teacherIdCookie?.value
      });
    });
  });
}

// Usage
async function authenticateWithClassLogger() {
  const cookies = await getAuthCookies();
  
  if (!cookies.authToken) {
    console.log('❌ No auth cookie found - user needs to login');
    return { success: false, error: 'No authentication found' };
  }
  
  // Test authentication with ClassLogger API
  try {
    const response = await fetch('http://localhost:3000/api/extension/auth-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        token: 'no_token' // Let it use cookies
      })
    });
    
    const result = await response.json();
    console.log('✅ Auth result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Auth request failed:', error);
    return { success: false, error: error.message };
  }
}
```

### **Method 2: Direct Token Usage**

```javascript
// Alternative: Send token directly in request body
async function authenticateWithToken() {
  const cookies = await getAuthCookies();
  
  if (!cookies.authToken) {
    return { success: false, error: 'No auth token found' };
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/extension/auth-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token: cookies.authToken // Send actual JWT token
      })
    });
    
    return await response.json();
    
  } catch (error) {
    console.error('❌ Token auth failed:', error);
    return { success: false, error: error.message };
  }
}
```

### **Method 3: Cookie Header (Fallback)**

```javascript
// Send cookie in header (if other methods fail)
async function authenticateWithCookieHeader() {
  const cookies = await getAuthCookies();
  
  if (!cookies.authToken) {
    return { success: false, error: 'No auth token found' };
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/extension/auth-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `classlogger_auth=${cookies.authToken}`
      },
      body: JSON.stringify({ token: 'no_token' })
    });
    
    return await response.json();
    
  } catch (error) {
    console.error('❌ Cookie header auth failed:', error);
    return { success: false, error: error.message };
  }
}
```

## 🧪 **Testing & Debugging**

### **Test Cookie Access**

```javascript
// Debug function to test cookie access
async function debugCookieAccess() {
  console.log('🔍 Testing cookie access...');
  
  // Test 1: Check if cookies permission is granted
  if (!chrome.cookies) {
    console.error('❌ Chrome cookies API not available - check manifest permissions');
    return;
  }
  
  // Test 2: Get all localhost cookies
  chrome.cookies.getAll({ domain: 'localhost' }, (cookies) => {
    console.log('🍪 All localhost cookies:', cookies);
    
    const classloggerCookies = cookies.filter(c => c.name.startsWith('classlogger'));
    console.log('🎯 ClassLogger cookies:', classloggerCookies);
    
    if (classloggerCookies.length === 0) {
      console.log('⚠️ No ClassLogger cookies found. User needs to login at http://localhost:3000');
    }
  });
  
  // Test 3: Try authentication
  const authResult = await authenticateWithClassLogger();
  console.log('🔐 Authentication result:', authResult);
}

// Run debug test
debugCookieAccess();
```

### **User Login Check**

```javascript
// Function to check if user needs to login
async function checkLoginStatus() {
  const cookies = await getAuthCookies();
  
  if (!cookies.authToken) {
    // Redirect user to login
    chrome.tabs.create({
      url: 'http://localhost:3000/auth/signin?role=teacher'
    });
    return false;
  }
  
  // Test if token is still valid
  const authResult = await authenticateWithClassLogger();
  if (!authResult.success) {
    // Token expired, redirect to login
    chrome.tabs.create({
      url: 'http://localhost:3000/auth/signin?role=teacher'
    });
    return false;
  }
  
  return true;
}
```

## 🎯 **ClassLogger API Endpoints**

Your extension can use these authenticated endpoints:

```javascript
// 1. Check authentication status
POST http://localhost:3000/api/extension/auth-status
Body: { "token": "no_token" } // Uses cookies

// 2. Start a class
POST http://localhost:3000/api/extension/start-class
Body: { "className": "Math 101", "platform": "zoom" }

// 3. End a class  
POST http://localhost:3000/api/extension/end-class
Body: { "classId": "class-id-here" }

// 4. Verify authentication
GET http://localhost:3000/api/extension/verify
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: "cookies is not defined"**
**Solution**: Add `"cookies"` to permissions in manifest.json

### **Issue 2: "Cannot read cookies from localhost"**
**Solution**: Add `"http://localhost:3000/*"` to host_permissions

### **Issue 3: "No auth cookie found" but cookies exist in browser**
**Solution**: Extension is looking in wrong domain. Use `domain: 'localhost'` not `url: 'http://localhost:3000'`

### **Issue 4: CORS errors**
**Solution**: ClassLogger APIs already have CORS configured for extensions. Make sure to include `credentials: 'include'` in fetch requests.

## 📋 **Implementation Checklist**

- [ ] Update manifest.json with cookies permission
- [ ] Add host_permissions for localhost:3000
- [ ] Implement getAuthCookies() function
- [ ] Test cookie access with debugCookieAccess()
- [ ] Implement authentication flow
- [ ] Add login redirect for unauthenticated users
- [ ] Test with actual ClassLogger APIs

## 🔗 **Next Steps**

1. **Update your extension's manifest.json** with the permissions above
2. **Implement the cookie access functions** in your extension
3. **Test cookie access** using the debug function
4. **Integrate with ClassLogger APIs** using the authenticated requests

The ClassLogger backend is working perfectly - this is purely an extension permissions and implementation issue.