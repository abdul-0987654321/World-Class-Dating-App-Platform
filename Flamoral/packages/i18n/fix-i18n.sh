#!/bin/bash
# Fix script for i18n package issues

echo "🔧 Fixing Flamoral i18n package..."

# Navigate to i18n package
cd "$(dirname "$0")"

echo "📝 Step 1: Fixing src/index.ts to use exports.ts..."
cat > src/index.ts << 'EOF'
/**
 * i18n Package Exports - Flamoral Dating Platform
 * Full internationalization support with 12 locales
 */

// Export everything from exports.ts (the comprehensive export file)
export * from './exports';
EOF

echo "✅ Step 1 complete: index.ts updated"

echo "📦 Step 2: Building i18n package..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Step 2 complete: Build successful"
else
    echo "❌ Build failed. Please check errors above."
    exit 1
fi

echo ""
echo "🎉 i18n package fixes applied successfully!"
echo ""
echo "Next steps:"
echo "1. cd ../../apps/web-app"
echo "2. Add '@flamoral/i18n': 'workspace:*' to package.json dependencies"
echo "3. Run: npm install"
echo "4. Update src/main.tsx to wrap app with I18nextProvider"
echo "5. See I18N_FIXES.md for detailed integration guide"
