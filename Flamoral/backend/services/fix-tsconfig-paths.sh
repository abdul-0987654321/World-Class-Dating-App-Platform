#!/bin/bash

# Fix TypeScript configuration paths across all backend services
# This script updates tsconfig.json files to use the correct shared package path

echo "Fixing TypeScript configuration paths..."

SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "matching-service"
  "messaging-service"
  "payment-service"
  "media-service"
  "notification-service"
  "moderation-service"
  "analytics-service"
  "admin-service"
  "advertising-service"
  "automation-service"
  "workflow-engine"
  "realtime-service"
  "policy-service"
)

for service in "${SERVICES[@]}"; do
  TSCONFIG_PATH="$service/tsconfig.json"

  if [ -f "$TSCONFIG_PATH" ]; then
    echo "Fixing $TSCONFIG_PATH..."

    # Create temporary file with corrected paths
    cat > "$TSCONFIG_PATH.tmp" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "types": ["node"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@flamoral/shared": ["../shared"],
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

    # Replace original with fixed version
    mv "$TSCONFIG_PATH.tmp" "$TSCONFIG_PATH"
    echo "  Fixed $service"
  else
    echo "  Skipping $service (tsconfig.json not found)"
  fi
done

echo ""
echo "All TypeScript configurations have been updated!"
echo "The @flamoral/shared path now correctly points to ../shared"
