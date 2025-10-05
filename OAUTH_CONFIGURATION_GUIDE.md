# Google OAuth Configuration Guide

## ✅ Fixed Issues

### 1. **Hardcoded Localhost Redirect URI** - FIXED ✅
**File:** `src/app/api/auth/google-exchange/route.ts`
**Before:** `redirect_uri: 'http://localhost:3000/auth/extension-callback'`
**After:** `redirect_uri: \`\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/extension-callback\``

### 2. **Dynamic URL Handling** - Already Correct ✅
- `src/lib/supabase.ts` - Uses `window.location.origin` (client) or environment variables (server)
- `src/components/ClassLogLanding.tsx` - Uses `window.location.origin` for redirects

## 🔧 Required Configuration

### Environment Variables

#### Production Environment (Vercel/Netlify/etc.)
```bash
NEXT_PUBLIC_APP_URL=https://classlogger.com
NEXT_PUBLIC_BASE_URL=https://classlogger.com
```

#### Development Environment (.env.local)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Google Cloud Console Configuration

**Location:** Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs

#### Authorized JavaScript Origins
```
https://classlogger.com
http://localhost:3000
```

#### Authorized Redirect URIs
```
# Production URLs
https://classlogger.com/auth/callback
https://classlogger.com/auth/extension-callback

# Development URLs  
http://localhost:3000/auth/callback
http://localhost:3000/auth/extension-callback
```

### Supabase Configuration

**Location:** Supabase Dashboard → Authentication → URL Configuration

#### Site URL
```
Production: https://classlogger.com
Development: http://localhost:3000
```

#### Redirect URLs
```
https://classlogger.com/auth/callback
https://classlogger.com/auth/extension-callback
http://localhost:3000/auth/callback
http://localhost:3000/auth/extension-callback
```

## 🧪 Testing

### Development Testing
1. Start local server: `npm run dev`
2. Visit: `http://localhost:3000`
3. Login with Google → Should redirect to `http://localhost:3000/?code=...`

### Production Testing
1. Deploy to production
2. Visit: `https://classlogger.com`
3. Login with Google → Should redirect to `https://classlogger.com/?code=...`

## 🔍 Verification Commands

### Check Environment Variables
```bash
# In production console
echo $NEXT_PUBLIC_APP_URL
echo $NEXT_PUBLIC_BASE_URL

# In browser console (any environment)
console.log(window.location.origin)
```

### Test OAuth Flow
```javascript
// Run in browser console to test redirect URL generation
const role = 'teacher'
const redirectUrl = `${window.location.origin}/auth/callback?role=${role}`
console.log('OAuth Redirect URL:', redirectUrl)
```

## 🚨 Common Issues & Solutions

### Issue: Still redirecting to localhost in production
**Solution:** 
1. Verify `NEXT_PUBLIC_APP_URL` is set in production environment
2. Redeploy application after setting environment variables
3. Clear browser cache and cookies

### Issue: OAuth callback not working
**Solution:**
1. Check Google Cloud Console redirect URIs match exactly
2. Verify Supabase redirect URLs are configured
3. Ensure no trailing slashes in URLs

### Issue: Extension callback failing
**Solution:**
1. Verify `/auth/extension-callback` route exists
2. Check Google OAuth client has correct redirect URI
3. Test with both development and production URLs

## 📋 Deployment Checklist

- [ ] Set `NEXT_PUBLIC_APP_URL` in production environment
- [ ] Configure Google Cloud Console redirect URIs
- [ ] Configure Supabase redirect URLs
- [ ] Test OAuth flow in production
- [ ] Verify extension authentication works
- [ ] Test both teacher and student login flows

## 🎯 Expected Behavior After Fix

### Before Fix
- Production login: `https://classlogger.com` → `http://localhost:3000/?code=...` ❌

### After Fix  
- Production login: `https://classlogger.com` → `https://classlogger.com/?code=...` ✅
- Development login: `http://localhost:3000` → `http://localhost:3000/?code=...` ✅

The OAuth redirect issue should now be completely resolved! 🚀