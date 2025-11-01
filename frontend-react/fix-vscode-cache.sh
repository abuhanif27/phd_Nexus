#!/bin/bash

echo "🔧 Fixing VS Code TypeScript Cache Issues"
echo "========================================"

# Remove TypeScript build info
echo "1️⃣ Removing TypeScript build info..."
rm -f tsconfig.tsbuildinfo
echo "   ✓ Removed tsconfig.tsbuildinfo"

# Remove Next.js cache
echo "2️⃣ Clearing Next.js cache..."
rm -rf .next
echo "   ✓ Removed .next directory"

# Remove TypeScript cache in node_modules
echo "3️⃣ Clearing node_modules TypeScript cache..."
find node_modules/.cache -name "*.tsbuildinfo" -delete 2>/dev/null || true
echo "   ✓ Cleared node_modules cache"

# Verify all files exist
echo ""
echo "4️⃣ Verifying files exist..."
if [ -f "app/providers.tsx" ]; then
    echo "   ✓ app/providers.tsx exists"
else
    echo "   ✗ app/providers.tsx NOT FOUND"
fi

if [ -f "components/app-shell/AppHeader.tsx" ]; then
    echo "   ✓ components/app-shell/AppHeader.tsx exists"
else
    echo "   ✗ components/app-shell/AppHeader.tsx NOT FOUND"
fi

if [ -f "components/app-shell/AppSidebar.tsx" ]; then
    echo "   ✓ components/app-shell/AppSidebar.tsx exists"
else
    echo "   ✗ components/app-shell/AppSidebar.tsx NOT FOUND"
fi

echo ""
echo "5️⃣ Running TypeScript check..."
npm run typecheck
if [ $? -eq 0 ]; then
    echo "   ✓ TypeScript compilation PASSED"
else
    echo "   ✗ TypeScript compilation FAILED"
    exit 1
fi

echo ""
echo "✅ All caches cleared successfully!"
echo ""
echo "📋 Next Steps in VS Code:"
echo "   1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
echo "   2. Type: 'Developer: Reload Window'"
echo "   3. Press Enter"
echo ""
echo "   OR"
echo ""
echo "   1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
echo "   2. Type: 'TypeScript: Restart TS Server'"
echo "   3. Press Enter"
echo ""
echo "The 'Cannot find module' errors should disappear!"
