# PowerShell script to update test files

# Backup original files
Write-Host "Backing up original files..."
Copy-Item -Path "jest.config.js" -Destination "jest.config.js.backup" -Force
Copy-Item -Path "tests\setup.ts" -Destination "tests\setup.ts.backup" -Force
Copy-Item -Path "__tests__\integration\messaging.integration.test.ts" -Destination "__tests__\integration\messaging.integration.test.ts.backup" -Force
Copy-Item -Path "tests\unit\message.service.test.ts" -Destination "tests\unit\message.service.test.ts.backup" -Force

# Replace with new files
Write-Host "Replacing with new files..."
Move-Item -Path "jest.config.new.js" -Destination "jest.config.js" -Force
Move-Item -Path "tests\setup.new.ts" -Destination "tests\setup.ts" -Force
Move-Item -Path "__tests__\integration\messaging.integration.new.test.ts" -Destination "__tests__\integration\messaging.integration.test.ts" -Force
Move-Item -Path "tests\unit\message.service.new.test.ts" -Destination "tests\unit\message.service.test.ts" -Force

Write-Host "Files updated successfully!"
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
