@echo off
REM Backup original files
copy jest.config.js jest.config.js.backup
copy tests\setup.ts tests\setup.ts.backup
copy __tests__\integration\messaging.integration.test.ts __tests__\integration\messaging.integration.test.ts.backup
copy tests\unit\message.service.test.ts tests\unit\message.service.test.ts.backup

REM Replace with new files
move /Y jest.config.new.js jest.config.js
move /Y tests\setup.new.ts tests\setup.ts
move /Y __tests__\integration\messaging.integration.new.test.ts __tests__\integration\messaging.integration.test.ts
move /Y tests\unit\message.service.new.test.ts tests\unit\message.service.test.ts

echo Files updated successfully!
pause
