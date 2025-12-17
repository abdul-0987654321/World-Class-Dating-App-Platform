# Fix TypeScript configuration paths across all backend services
# This PowerShell script updates tsconfig.json files to use the correct shared package path

Write-Host "Fixing TypeScript configuration paths..." -ForegroundColor Green

$services = @(
    "api-gateway",
    "auth-service",
    "user-service",
    "matching-service",
    "messaging-service",
    "payment-service",
    "media-service",
    "notification-service",
    "moderation-service",
    "analytics-service",
    "admin-service",
    "advertising-service",
    "automation-service",
    "workflow-engine",
    "realtime-service",
    "policy-service",
    "ai-services"
)

$tsconfigContent = @'
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
'@

$fixedCount = 0
$skippedCount = 0

foreach ($service in $services) {
    $tsconfigPath = Join-Path $service "tsconfig.json"

    if (Test-Path $tsconfigPath) {
        Write-Host "Fixing $tsconfigPath..." -ForegroundColor Yellow
        $tsconfigContent | Out-File -FilePath $tsconfigPath -Encoding UTF8
        Write-Host "  Fixed $service" -ForegroundColor Green
        $fixedCount++
    } else {
        Write-Host "  Skipping $service (tsconfig.json not found)" -ForegroundColor Gray
        $skippedCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TypeScript Configuration Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services fixed: $fixedCount" -ForegroundColor Green
Write-Host "Services skipped: $skippedCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "The @flamoral/shared path now correctly points to ../shared" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm install' or 'yarn install' in each service directory" -ForegroundColor White
Write-Host "2. Run 'npm run build' or 'yarn build' to verify TypeScript compilation" -ForegroundColor White
Write-Host "3. Check for any remaining TypeScript errors" -ForegroundColor White
