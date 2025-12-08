# PowerShell script to update backend service dependencies
# Run this from the DatingPlatform root directory

Write-Host "Starting dependency updates..." -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{ Path = "backend/services/messaging-service"; Axios = $true; Knex = $true; Shared = $true },
    @{ Path = "backend/services/advertising-service"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/analytics-service"; Axios = $false; Knex = $true; Shared = $true },
    @{ Path = "backend/services/api-gateway"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/auth-service"; Axios = $false; Knex = $true; Shared = $true },
    @{ Path = "backend/services/matching-service"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/media-service"; Axios = $true; Knex = $false; Shared = $true },
    @{ Path = "backend/services/moderation-service"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/notification-service"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/payment-service"; Axios = $false; Knex = $false; Shared = $true },
    @{ Path = "backend/services/user-service"; Axios = $true; Knex = $false; Shared = $true }
)

foreach ($service in $services) {
    $pkgPath = Join-Path $service.Path "package.json"

    Write-Host "Processing: $($service.Path)" -ForegroundColor Yellow

    try {
        # Read package.json
        $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $modified = $false

        # Ensure dependencies object exists
        if (-not $pkg.dependencies) {
            $pkg.dependencies = @{}
        }

        # Convert PSCustomObject to OrderedHashtable for proper ordering
        $deps = [ordered]@{}

        # Add @flamoral/shared first if needed
        if ($service.Shared -and -not $pkg.dependencies.'@flamoral/shared') {
            $deps['@flamoral/shared'] = '*'
            Write-Host "  ✓ Added @flamoral/shared" -ForegroundColor Green
            $modified = $true
        }

        # Copy existing dependencies
        $pkg.dependencies.PSObject.Properties | ForEach-Object {
            if ($_.Name -ne '@flamoral/shared') {
                $deps[$_.Name] = $_.Value
            } elseif ($service.Shared) {
                $deps[$_.Name] = $_.Value
            }
        }

        # Add axios if needed
        if ($service.Axios -and -not $deps['axios']) {
            $deps['axios'] = '^1.6.2'
            Write-Host "  ✓ Added axios" -ForegroundColor Green
            $modified = $true
        }

        # Add knex if needed
        if ($service.Knex -and -not $deps['knex']) {
            $deps['knex'] = '^3.1.0'
            Write-Host "  ✓ Added knex" -ForegroundColor Green
            $modified = $true
        }

        if ($modified) {
            # Update dependencies
            $pkg.dependencies = $deps

            # Write back to file with proper formatting
            $json = $pkg | ConvertTo-Json -Depth 10
            $json | Set-Content $pkgPath -Encoding UTF8
            Write-Host "  → Updated $pkgPath" -ForegroundColor Cyan
        } else {
            Write-Host "  → No changes needed" -ForegroundColor Gray
        }

        Write-Host ""
    }
    catch {
        Write-Host "  ✗ Error updating $($service.Path): $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "Dependency updates complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary of changes:" -ForegroundColor Cyan
Write-Host "- Added @flamoral/shared to all 11 backend services"
Write-Host "- Added axios to: messaging-service, media-service, user-service"
Write-Host "- Added knex to: messaging-service, analytics-service, auth-service"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm install' in the root directory"
Write-Host "2. Test the changes locally"
Write-Host "3. Run the CI pipeline"
