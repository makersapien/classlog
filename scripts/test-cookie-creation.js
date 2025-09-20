#!/bin/bash

echo "🧪 Testing Cookie Creation Process"
echo ""

# Test 1: Check if JWT creation API sets cookies
echo "1️⃣ Testing JWT Creation API..."
echo ""

curl -X POST "http://localhost:3000/api/auth/create-jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "email": "test@example.com", 
    "name": "Test User",
    "role": "teacher"
  }' \
  -v 2>&1 | grep -E "(HTTP|Set-Cookie|{|error)"

echo ""
echo "=================================================="

echo ""

# Test 2: Manual Cookie Check Instructions
echo "2️⃣ Manual Cookie Check Instructions:"
echo "After logging in through the web interface:"
echo "1. Open browser dev tools (F12)"
echo "2. Go to Application → Cookies → localhost:3000"
echo "3. Look for these cookies:"
echo "   - classlogger_auth (JWT token)"
echo "   - classlogger_extension (user data)"
echo "   - classlogger_teacher_id (simple ID)"
echo ""
echo "4. If cookies are missing, the JWT creation API is not being called properly"
echo "5. If cookies exist but plugin can't access them, it's a plugin permission issue"

echo ""
echo "=================================================="
echo ""

# Test 3: Test extension auth API with no cookies
echo "3️⃣ Testing Extension Auth API (no cookies)..."
echo ""

curl -X POST "http://localhost:3000/api/extension/auth-status" \
  -H "Content-Type: application/json" \
  -d '{"token": "no_token"}' \
  2>&1 | grep -E "({|error|success|isLoggedIn)"