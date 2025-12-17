$vaults = @('flamoral-prod-auth-kv', 'flamoral-prod-payment-kv', 'flamoral-prod-data-kv', 'flamoral-prod-ext-kv', 'flamoral-prod-infra-kv')
$userId = '53cf39d2-2af7-4f57-8577-678eb0083e1b'
$subId = 'ebd1613e-fea0-4b6d-8918-7e4de6a71c44'

foreach ($vault in $vaults) {
    Write-Host "Granting access to $vault..." -ForegroundColor Cyan
    $scope = "/subscriptions/$subId/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/$vault"
    $result = az role assignment create --role "Key Vault Secrets Officer" --assignee-object-id $userId --assignee-principal-type User --scope $scope --only-show-errors 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "  Already assigned or skipped" -ForegroundColor Yellow
    }
}
Write-Host "Done granting RBAC access!" -ForegroundColor Green
