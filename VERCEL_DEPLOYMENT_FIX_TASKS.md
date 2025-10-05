# Vercel Deployment Fix Tasks

## 🎯 **Error Analysis:**
- **Error**: `supabaseUrl is required`
- **Location**: `/api/auth/extension-login` route
- **Cause**: Missing Supabase environment variables in Vercel
- **Status**: 🔴 CRITICAL - Blocks deployment

## 📋 **Task List:**

### ✅ **Task 1: Add Environment Variables to Vercel**
**Priority**: CRITICAL
**Time**: 5 minutes

**Required Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
```

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above with your actual values
3. Set Environment to: **Production, Preview, Development**
4. Click "Save"

### ✅ **Task 2: Check Missing API Route**
**Priority**: HIGH
**Time**: 2 minutes

**Issue**: Error mentions `/api/auth/extension-login` but this route might not exist
**Action**: Verify if this route exists or remove references to it

### ✅ **Task 3: Fix Environment Variable Loading**
**Priority**: MEDIUM
**Time**: 3 minutes

**Issue**: Some files might not be handling missing env vars gracefully
**Action**: Add fallback values or better error handling

### ✅ **Task 4: Update OAuth Redirect URLs**
**Priority**: HIGH
**Time**: 5 minutes

**Issue**: OAuth callbacks need production URLs
**Action**: Update Google OAuth and Supabase with production URLs

## 🔧 **Immediate Actions:**

### **Step 1: Get Your Environment Variables**
From your local `.env.local` file, copy these values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### **Step 2: Add to Vercel**
1. Visit: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable

### **Step 3: Redeploy**
After adding env vars, trigger a new deployment

## 🎯 **Expected Result:**
- ✅ Build succeeds in Vercel
- ✅ All API routes work
- ✅ Supabase connection established
- ✅ Authentication flows work

## 🚨 **Critical Notes:**
- **NEVER commit `.env.local` to git**
- **Use different JWT_SECRET for production**
- **Update OAuth redirect URLs for production domain**
- **Test all authentication flows after deployment**