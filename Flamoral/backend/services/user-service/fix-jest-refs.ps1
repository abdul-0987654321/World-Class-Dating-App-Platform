# PowerShell script to add Jest type references to test files
# Run this from the user-service directory

$jestRef = "/// <reference types=`"jest`" />`r`n"

$filesToFix = @(
    "src\__tests__\unit\services\verification.service.test.ts",
    "tests\unit\profile.service.test.ts",
    "tests\e2e\api\user-api.spec.ts"
)

Write-Host "Adding Jest type references to test files..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $filesToFix) {
    $fullPath = Join-Path $PSScriptRoot $file

    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw

        # Check if already has the reference
        if ($content -match "^/// <reference types=`"jest`"") {
            Write-Host "✓ Already has jest reference: $file" -ForegroundColor Green
        }
        else {
            # Add the jest reference at the beginning
            $newContent = $jestRef + $content
            Set-Content -Path $fullPath -Value $newContent -NoNewline
            Write-Host "✓ Added jest reference to: $file" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! You can now run: npm test -- --testTimeout=60000" -ForegroundColor Green
