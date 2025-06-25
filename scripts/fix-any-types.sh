#!/bin/bash
echo "🤖 Auto-fixing TypeScript any types..."

# Fix the biggest offenders first - debug page
sed -i.bak 's/: any\[\]/: unknown[]/g' src/app/debug/page.tsx
sed -i.bak 's/useState<any>/useState<unknown>/g' src/app/debug/page.tsx

# Fix onboarding page
sed -i.bak 's/invitation: any/invitation: unknown/g' src/app/onboarding/\[token\]/page.tsx

# Fix component event handlers
sed -i.bak 's/(e: any)/(e: React.FormEvent)/g' src/components/AddStudentModal.tsx

# Fix API routes - replace simple any with unknown (safer)
find src/app/api -name "*.ts" -exec sed -i.bak 's/: any/: unknown/g' {} \;

# Fix dashboard components
sed -i.bak 's/useState<any>/useState<unknown>/g' src/app/dashboard/TeacherDashboard.tsx

# Fix database types - use safer alternatives
sed -i.bak 's/Json: any/Json: unknown/g' src/types/database.ts
sed -i.bak 's/Row: any/Row: Record<string, unknown>/g' src/types/database.ts

# Fix Razorpay types
sed -i.bak 's/: any/: unknown/g' src/types/razorpay.ts

echo "✅ Auto-fixes complete!"
echo "📊 Remaining any types:"
grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l
