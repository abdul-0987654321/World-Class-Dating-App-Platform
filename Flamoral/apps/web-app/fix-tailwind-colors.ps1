# PowerShell script to fix Tailwind color classes

Write-Host "Fixing Tailwind color classes in component files..." -ForegroundColor Cyan

# Get all TSX/JSX files
$componentFiles = Get-ChildItem -Path ".\src" -Filter "*.tsx" -Recurse

foreach ($file in $componentFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow

    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Replace flame- colors with pink-
    $content = $content -replace 'flame-50', 'pink-50'
    $content = $content -replace 'flame-100', 'pink-100'
    $content = $content -replace 'flame-200', 'pink-200'
    $content = $content -replace 'flame-300', 'pink-300'
    $content = $content -replace 'flame-400', 'pink-400'
    $content = $content -replace 'flame-500', 'pink-500'
    $content = $content -replace 'flame-600', 'pink-600'
    $content = $content -replace 'flame-700', 'pink-700'
    $content = $content -replace 'flame-800', 'pink-800'
    $content = $content -replace 'flame-900', 'pink-900'

    # Replace charcoal- colors with gray-
    $content = $content -replace 'charcoal-50', 'gray-50'
    $content = $content -replace 'charcoal-100', 'gray-100'
    $content = $content -replace 'charcoal-200', 'gray-200'
    $content = $content -replace 'charcoal-300', 'gray-300'
    $content = $content -replace 'charcoal-400', 'gray-400'
    $content = $content -replace 'charcoal-500', 'gray-500'
    $content = $content -replace 'charcoal-600', 'gray-600'
    $content = $content -replace 'charcoal-700', 'gray-700'
    $content = $content -replace 'charcoal-800', 'gray-800'
    $content = $content -replace 'charcoal-900', 'gray-900'

    # Replace ivory with white
    $content = $content -replace 'text-ivory\b', 'text-white'
    $content = $content -replace 'bg-ivory\b', 'bg-white'

    # Replace gradient classes
    $content = $content -replace 'bg-gradient-flamoral\b', 'bg-gradient-pink-blue'
    $content = $content -replace 'text-gradient-flamoral\b', 'text-gradient-pink-blue'
    $content = $content -replace 'shadow-flame\b', 'shadow-glow-pink'

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Fixed $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  - No changes needed for $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "`nTailwind color fixes completed!" -ForegroundColor Green
