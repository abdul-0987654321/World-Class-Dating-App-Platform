# PowerShell script to fix API endpoint URLs

Write-Host "Fixing API endpoint URLs in service files..." -ForegroundColor Cyan

# Get all service files
$serviceFiles = Get-ChildItem -Path ".\src\services" -Filter "*.ts" -Recurse

foreach ($file in $serviceFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow

    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Replace all /api/ prefixes in apiClient calls
    $content = $content -replace "'/api/auth/", "'/auth/"
    $content = $content -replace '"/api/auth/', '"/auth/'
    $content = $content -replace "'/api/users/", "'/users/"
    $content = $content -replace '"/api/users/', '"/users/'
    $content = $content -replace "'/api/matches/", "'/matches/"
    $content = $content -replace '"/api/matches/', '"/matches/'
    $content = $content -replace "'/api/profile/", "'/profile/"
    $content = $content -replace '"/api/profile/', '"/profile/'
    $content = $content -replace "'/api/profiles/", "'/profiles/"
    $content = $content -replace '"/api/profiles/', '"/profiles/'
    $content = $content -replace "'/api/matching/", "'/matching/"
    $content = $content -replace '"/api/matching/', '"/matching/'
    $content = $content -replace "'/api/messaging/", "'/messaging/"
    $content = $content -replace '"/api/messaging/', '"/messaging/'
    $content = $content -replace "'/api/discovery/", "'/discovery/"
    $content = $content -replace '"/api/discovery/', '"/discovery/'
    $content = $content -replace "'/api/safety/", "'/safety/"
    $content = $content -replace '"/api/safety/', '"/safety/'
    $content = $content -replace "'/api/reports/", "'/reports/"
    $content = $content -replace '"/api/reports/', '"/reports/'
    $content = $content -replace "'/api/blocks/", "'/blocks/"
    $content = $content -replace '"/api/blocks/', '"/blocks/'
    $content = $content -replace "'/api/subscriptions/", "'/subscriptions/"
    $content = $content -replace '"/api/subscriptions/', '"/subscriptions/'
    $content = $content -replace "'/api/boosts/", "'/boosts/"
    $content = $content -replace '"/api/boosts/', '"/boosts/'
    $content = $content -replace "'/api/coins/", "'/coins/"
    $content = $content -replace '"/api/coins/', '"/coins/'
    $content = $content -replace "'/api/admin/", "'/admin/"
    $content = $content -replace '"/api/admin/', '"/admin/'

    # Fix fetch calls in api.client.ts
    $content = $content -replace '\$\{this\.baseUrl\}/api/', '${this.baseUrl}/'

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Fixed $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  - No changes needed for $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "`nAPI URL fixes completed!" -ForegroundColor Green
