$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

# Get the timeline for Build 164 to find the Plan task
$timeline = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/164/timeline?api-version=7.1' -Headers $headers

# Find the Terraform Plan task
$planTask = $timeline.records | Where-Object { $_.name -like '*Plan*dev*' -and $_.type -eq 'Task' }

if ($planTask) {
    Write-Host "Plan Task ID: $($planTask.id)"
    Write-Host "Log ID: $($planTask.log.id)"
    Write-Host "Result: $($planTask.result)"

    # Get the log
    if ($planTask.log.id) {
        $logUrl = "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/164/logs/$($planTask.log.id)?api-version=7.1"
        Write-Host ""
        Write-Host "=== TERRAFORM PLAN LOG (last 200 lines) ==="
        $log = Invoke-RestMethod -Uri $logUrl -Headers $headers
        $lines = $log -split "`n"
        $lines | Select-Object -Last 200
    }
} else {
    Write-Host "Plan task not found"
}
