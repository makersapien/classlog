#!/bin/bash

# Quick fix script for the remaining 146 ESLint errors
# Run these commands one by one to systematically fix issues

echo "🚀 Starting systematic ESLint fixes..."

# 1. Fix unused variables by removing them or prefixing with underscore
echo "🧹 Step 1: Fixing unused variables..."

# Create a sed script to fix common unused variable patterns
cat > fix_unused_vars.sed << 'EOF'
# Remove unused variables that are assigned but never used
s/const authData = .*/\/\/ const authData = ... \/\/ Removed unused variable/g
s/const invitation_id = .*/\/\/ const invitation_id = ... \/\/ Removed unused variable/g
s/const studentError = .*/\/\/ const studentError = ... \/\/ Removed unused variable/g
s/const classInfoError = .*/\/\/ const classInfoError = ... \/\/ Removed unused variable/g
s/const newToken = .*/\/\/ const newToken = ... \/\/ Removed unused variable/g
s/const tokenError = .*/\/\/ const tokenError = ... \/\/ Removed unused variable/g
s/const uploadData = .*/\/\/ const uploadData = ... \/\/ Removed unused variable/g
s/const result = .*/\/\/ const result = ... \/\/ Removed unused variable/g

# Add underscore prefix to function parameters that are unused
s/request: NextRequest/_request: NextRequest/g
s/err)/_err)/g
s/error)/_error)/g
EOF

# Apply the fixes to API routes
find src/app/api -name "*.ts" -exec sed -i.bak -f fix_unused_vars.sed {} \;

echo "✅ Step 1 complete"

# 2. Fix unescaped entities in JSX files
echo "📝 Step 2: Fixing unescaped entities in JSX..."

# Fix apostrophes in JSX
find src -name "*.tsx" -exec sed -i.bak "s/\\(>[^<]*\\)'\\([^<]*<\\)/\\1\&apos;\\2/g" {} \;

# Fix quotes in JSX content (more targeted)
find src -name "*.tsx" -exec sed -i.bak 's/\(>[^<]*\)"\([^<]*<\)/\1\&quot;\2/g' {} \;

echo "✅ Step 2 complete"

# 3. Remove unused imports
echo "🗑️  Step 3: Removing common unused imports..."

# Remove common unused imports
sed -i.bak '/import.*useEffect.*from.*react/d' src/app/dashboard/ParentDashboard.tsx
sed -i.bak '/import.*useEffect.*from.*react/d' src/app/dashboard/StudentDashboard.tsx
sed -i.bak '/import.*useEffect.*from.*react/d' src/components/ClassLogLanding.tsx

# Remove unused UI component imports
sed -i.bak '/import.*AvatarImage/d' src/app/dashboard/ParentDashboard.tsx
sed -i.bak '/import.*Avatar.*AvatarFallback.*AvatarImage/d' src/app/dashboard/StudentDashboard.tsx
sed -i.bak '/import.*Separator/d' src/app/dashboard/ParentDashboard.tsx
sed -i.bak '/import.*Separator/d' src/app/dashboard/TeacherDashboard.tsx
sed -i.bak '/import.*Star.*Crown/d' src/app/dashboard/StudentDashboard.tsx

echo "✅ Step 3 complete"

# 4. Fix prefer-const issues
echo "🔄 Step 4: Converting let to const..."

# Fix specific prefer-const issues in classes/route.ts
sed -i.bak 's/let \(student_email\|google_meet_url\|meetUrl\|enrollment_id\|manual_override\|start_time\|class_log_id\|content\|topics_covered\|homework_assigned\|end_time\)/const \1/g' src/app/api/classes/route.ts

echo "✅ Step 4 complete"

# 5. Fix empty interfaces in api.ts
echo "🏗️  Step 5: Fixing empty interfaces..."

cat > fix_interfaces.sed << 'EOF'
s/export interface FormEvent extends React\.FormEvent<HTMLFormElement> {}/export type FormEvent = React.FormEvent<HTMLFormElement>;/g
s/export interface ChangeEvent extends React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {}/export type ChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;/g
s/export interface ClickEvent extends React\.MouseEvent<HTMLButtonElement | HTMLDivElement> {}/export type ClickEvent = React.MouseEvent<HTMLButtonElement | HTMLDivElement>;/g
EOF

sed -i.bak -f fix_interfaces.sed src/types/api.ts

echo "✅ Step 5 complete"

# 6. Clean up backup files
echo "🧽 Step 6: Cleaning up backup files..."
find src -name "*.bak" -delete
rm -f fix_unused_vars.sed fix_interfaces.sed

echo "🎉 Quick fixes complete!"
echo ""
echo "📊 Remaining manual fixes needed:"
echo "1. Replace 'any' types with proper interfaces (43 instances)"
echo "2. Add missing useEffect dependencies (3 instances)" 
echo "3. Fix remaining unescaped entities (check build output)"
echo ""
echo "🔍 Run 'npm run build' to see remaining issues"