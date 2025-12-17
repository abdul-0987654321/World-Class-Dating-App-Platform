# =============================================================================
# Flamoral Dating Platform - Azure Budget Setup Script
# =============================================================================
# This script creates and configures Azure Budgets for cost monitoring
# and alerts across different environments.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory=$false)]
    [string]$NotificationEmail = "alerts@flamoral.com"
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Azure Budget Setup Script                  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made" -ForegroundColor Cyan
}

# =============================================================================
# Configuration
# =============================================================================
$subscriptionId = (az account show --query id -o tsv)

$budgets = @(
    @{
        Name = "flamoral-prod-budget"
        Scope = "flamoral-prod-rg"
        Amount = 1500
        ThresholdPercents = @(50, 75, 90, 100)
        Category = "Production"
        TimeGrain = "Monthly"
    },
    @{
        Name = "flamoral-dev-budget"
        Scope = "flamoral-dev-rg"
        Amount = 100
        ThresholdPercents = @(50, 80, 100)
        Category = "Development"
        TimeGrain = "Monthly"
    },
    @{
        Name = "flamoral-staging-budget"
        Scope = "flamoral-staging-rg"
        Amount = 200
        ThresholdPercents = @(50, 80, 100)
        Category = "Staging"
        TimeGrain = "Monthly"
    },
    @{
        Name = "flamoral-shared-budget"
        Scope = "flamoral-shared-rg"
        Amount = 600
        ThresholdPercents = @(75, 90, 100)
        Category = "Shared Infrastructure"
        TimeGrain = "Monthly"
    },
    @{
        Name = "flamoral-total-budget"
        Scope = "subscription"
        Amount = 2500
        ThresholdPercents = @(50, 75, 90, 100, 110)
        Category = "Total Subscription"
        TimeGrain = "Monthly"
    }
)

# =============================================================================
# Create Budgets
# =============================================================================
foreach ($budget in $budgets) {
    Write-Host ""
    Write-Host "=== Creating Budget: $($budget.Name) ===" -ForegroundColor Yellow
    Write-Host "  Category: $($budget.Category)"
    Write-Host "  Amount: `$$($budget.Amount)/month"
    Write-Host "  Thresholds: $($budget.ThresholdPercents -join '%, ')%"

    # Determine scope
    if ($budget.Scope -eq "subscription") {
        $scope = "/subscriptions/$subscriptionId"
    } else {
        $scope = "/subscriptions/$subscriptionId/resourceGroups/$($budget.Scope)"
    }

    # Get start of current month
    $startDate = Get-Date -Day 1 -Hour 0 -Minute 0 -Second 0
    $startDateStr = $startDate.ToString("yyyy-MM-01")

    # End date - 10 years from now
    $endDate = $startDate.AddYears(10)
    $endDateStr = $endDate.ToString("yyyy-MM-dd")

    # Build notifications array
    $notifications = @{}
    foreach ($threshold in $budget.ThresholdPercents) {
        $notifName = "Notification_$threshold"
        $notifications[$notifName] = @{
            enabled = $true
            operator = "GreaterThanOrEqualTo"
            threshold = $threshold
            contactEmails = @($NotificationEmail)
            thresholdType = "Actual"
        }
    }

    $budgetPayload = @{
        properties = @{
            category = "Cost"
            amount = $budget.Amount
            timeGrain = $budget.TimeGrain
            timePeriod = @{
                startDate = $startDateStr
                endDate = $endDateStr
            }
            notifications = $notifications
        }
    } | ConvertTo-Json -Depth 10

    if ($DryRun) {
        Write-Host "[DRY RUN] Would create budget at scope: $scope" -ForegroundColor Cyan
        Write-Host "[DRY RUN] Payload preview:" -ForegroundColor Cyan
        Write-Host $budgetPayload -ForegroundColor Gray
    } else {
        try {
            # Create budget using REST API
            $token = az account get-access-token --query accessToken -o tsv
            $uri = "https://management.azure.com$scope/providers/Microsoft.Consumption/budgets/$($budget.Name)?api-version=2023-11-01"

            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }

            $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $budgetPayload
            Write-Host "  Budget created successfully!" -ForegroundColor Green
        } catch {
            if ($_.Exception.Response.StatusCode -eq 409) {
                Write-Host "  Budget already exists, updating..." -ForegroundColor Yellow
                try {
                    $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $budgetPayload
                    Write-Host "  Budget updated successfully!" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed to update budget: $_" -ForegroundColor Red
                }
            } else {
                Write-Host "  Failed to create budget: $_" -ForegroundColor Red
            }
        }
    }
}

# =============================================================================
# Create Cost Anomaly Alerts
# =============================================================================
Write-Host ""
Write-Host "=== Setting Up Cost Anomaly Detection ===" -ForegroundColor Yellow

$anomalyAlertPayload = @{
    properties = @{
        displayName = "Flamoral Cost Anomaly Alert"
        description = "Alert when unusual spending patterns are detected"
        notificationEmail = $NotificationEmail
        threshold = 0
    }
} | ConvertTo-Json

Write-Host "Cost anomaly detection is handled at the subscription level via Azure Cost Management"
Write-Host "Please configure anomaly alerts in Azure Portal > Cost Management > Cost alerts"

# =============================================================================
# Summary
# =============================================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  BUDGET SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Budgets Configured:" -ForegroundColor White

$totalBudget = 0
foreach ($budget in $budgets) {
    if ($budget.Scope -ne "subscription") {
        Write-Host "  - $($budget.Name): `$$($budget.Amount)/month ($($budget.Category))"
        $totalBudget += $budget.Amount
    }
}

Write-Host ""
Write-Host "Total Non-Subscription Budgets: `$$totalBudget/month"
Write-Host "Subscription-level Budget: `$$($budgets | Where-Object { $_.Scope -eq 'subscription' } | Select-Object -ExpandProperty Amount)/month"
Write-Host ""
Write-Host "Notification Email: $NotificationEmail"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Verify budgets in Azure Portal > Cost Management > Budgets"
Write-Host "2. Update notification email if needed"
Write-Host "3. Configure action groups for automated responses"
Write-Host "4. Enable cost anomaly detection in Cost Management"
