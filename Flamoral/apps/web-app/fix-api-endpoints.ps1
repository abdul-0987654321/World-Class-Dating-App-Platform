# Fix API Endpoints - Remove duplicate /api/ prefix
# VITE_API_URL already includes /api/v1, so we should remove /api/ from all service endpoints

Write-Host "Fixing API endpoints in service files..." -ForegroundColor Cyan

$servicesDir = ".\src\services"
$tsFiles = Get-ChildItem -Path $servicesDir -Filter "*.ts" -Recurse

$totalReplacements = 0

foreach ($file in $tsFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content

    # Replace '/api/ with '/ (removes the /api prefix from all endpoints)
    # This matches patterns like:
    # - '/api/profile/...'  -> '/profile/...'
    # - '/api/auth/...'     -> '/auth/...'
    # - '/api/matching/...' -> '/matching/...'
    # etc.
    $content = $content -replace "(['\`"])\/api\/", '$1/'

    if ($content -ne $originalContent) {
        $changes = ($originalContent.Length - $content.Length) / 5  # Approximate number of changes
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Fixed $($file.Name)" -ForegroundColor Green
        $totalReplacements++
    }
}

Write-Host "`nCompleted! Fixed $totalReplacements files" -ForegroundColor Cyan
Write-Host "All service endpoints now use paths relative to VITE_API_URL (/api/v1)" -ForegroundColor Green
