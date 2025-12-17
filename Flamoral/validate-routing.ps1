# Routing Validation Script
# Validates all routing configurations and files

Write-Host "=== Flamoral Frontend Routing Validation ===" -ForegroundColor Cyan
Write-Host ""

$webAppPath = ".\apps\web-app"
$errors = @()
$warnings = @()

# Check if files exist
Write-Host "1. Checking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "$webAppPath\src\App.tsx",
    "$webAppPath\src\components\ProtectedRoute.tsx",
    "$webAppPath\src\components\ErrorBoundary.tsx",
    "$webAppPath\src\components\RouteGuard.tsx",
    "$webAppPath\src\utils\routing.ts",
    "$webAppPath\src\hooks\useAppNavigation.ts",
    "$webAppPath\src\pages\NotFoundPage.tsx"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        $errors += "Missing file: $file"
        Write-Host "  ✗ $file" -ForegroundColor Red
    }
}

Write-Host ""

# Check critical page exports
Write-Host "2. Checking page exports..." -ForegroundColor Yellow

$criticalPages = @(
    "$webAppPath\src\pages\Discovery\DiscoveryPage.tsx",
    "$webAppPath\src\pages\Matches\MatchesPage.tsx",
    "$webAppPath\src\pages\Messages\MessagesPage.tsx",
    "$webAppPath\src\pages\Profile\ProfilePage.tsx",
    "$webAppPath\src\pages\Auth\LoginPage.tsx",
    "$webAppPath\src\pages\Auth\SignupPage.tsx"
)

foreach ($page in $criticalPages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        if ($content -match "export\s+(default|const\s+\w+Page)") {
            Write-Host "  ✓ $(Split-Path $page -Leaf) has export" -ForegroundColor Green
        } else {
            $warnings += "Page may be missing export: $page"
            Write-Host "  ⚠ $(Split-Path $page -Leaf) export unclear" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Check Admin index exports
Write-Host "3. Checking Admin page index..." -ForegroundColor Yellow

$adminIndexPath = "$webAppPath\src\pages\Admin\index.ts"
if (Test-Path $adminIndexPath) {
    $indexContent = Get-Content $adminIndexPath -Raw
    $expectedExports = @(
        "AdminDashboardPage",
        "AdminUsersPage",
        "AdminVerificationsPage",
        "AdminReportsPage",
        "AdminAnalyticsPage",
        "AdminModerationPage",
        "AdminSettingsPage"
    )

    foreach ($export in $expectedExports) {
        if ($indexContent -match $export) {
            Write-Host "  ✓ $export exported" -ForegroundColor Green
        } else {
            $warnings += "Admin page not exported: $export"
            Write-Host "  ⚠ $export not found" -ForegroundColor Yellow
        }
    }
} else {
    $errors += "Missing Admin index.ts"
}

Write-Host ""

# Check React Router is installed
Write-Host "4. Checking dependencies..." -ForegroundColor Yellow

$packageJsonPath = "$webAppPath\package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

    if ($packageJson.dependencies.'react-router-dom') {
        Write-Host "  ✓ react-router-dom installed: $($packageJson.dependencies.'react-router-dom')" -ForegroundColor Green
    } else {
        $errors += "react-router-dom not installed"
        Write-Host "  ✗ react-router-dom not found" -ForegroundColor Red
    }

    if ($packageJson.dependencies.'react') {
        Write-Host "  ✓ react installed: $($packageJson.dependencies.'react')" -ForegroundColor Green
    } else {
        $errors += "react not installed"
        Write-Host "  ✗ react not found" -ForegroundColor Red
    }
} else {
    $errors += "package.json not found"
}

Write-Host ""

# Check for route configuration
Write-Host "5. Checking route configuration..." -ForegroundColor Yellow

$appTsxPath = "$webAppPath\src\App.tsx"
if (Test-Path $appTsxPath) {
    $appContent = Get-Content $appTsxPath -Raw

    # Check for critical routing components
    $routingComponents = @{
        "BrowserRouter" = "BrowserRouter component"
        "Routes" = "Routes component"
        "Route" = "Route component"
        "ProtectedRoute" = "ProtectedRoute component"
        "ErrorBoundary" = "ErrorBoundary component"
        "RouteGuard" = "RouteGuard component"
        "usePreloadRoutes" = "Route preloading"
    }

    foreach ($component in $routingComponents.Keys) {
        if ($appContent -match $component) {
            Write-Host "  ✓ $($routingComponents[$component])" -ForegroundColor Green
        } else {
            $warnings += "Missing in App.tsx: $($routingComponents[$component])"
            Write-Host "  ⚠ $($routingComponents[$component]) not found" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Summary
Write-Host "=== Validation Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0) {
    Write-Host "✓ No critical errors found!" -ForegroundColor Green
} else {
    Write-Host "✗ Found $($errors.Count) error(s):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

Write-Host ""

if ($warnings.Count -eq 0) {
    Write-Host "✓ No warnings!" -ForegroundColor Green
} else {
    Write-Host "⚠ Found $($warnings.Count) warning(s):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
}

Write-Host ""

# Recommendations
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run TypeScript check:" -ForegroundColor White
Write-Host "   cd apps\web-app && npm run typecheck" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run development server:" -ForegroundColor White
Write-Host "   cd apps\web-app && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test routing manually:" -ForegroundColor White
Write-Host "   - Navigate to public routes without auth" -ForegroundColor Gray
Write-Host "   - Try accessing protected routes" -ForegroundColor Gray
Write-Host "   - Test admin routes" -ForegroundColor Gray
Write-Host "   - Test 404 page" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Review documentation:" -ForegroundColor White
Write-Host "   - FRONTEND_ROUTING_FIX_SUMMARY.md" -ForegroundColor Gray
Write-Host "   - ROUTING_QUICK_REFERENCE.md" -ForegroundColor Gray
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ Routing validation passed! Ready for testing." -ForegroundColor Green
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠ Validation passed with warnings. Review before deployment." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✗ Validation failed. Fix errors before proceeding." -ForegroundColor Red
    exit 1
}
