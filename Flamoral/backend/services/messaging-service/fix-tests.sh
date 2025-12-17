#!/bin/bash

# Backup original files
cp jest.config.js jest.config.js.backup
cp tests/setup.ts tests/setup.ts.backup
cp __tests__/integration/messaging.integration.test.ts __tests__/integration/messaging.integration.test.ts.backup

# Replace with new files
mv jest.config.new.js jest.config.js
mv tests/setup.new.ts tests/setup.ts
mv __tests__/integration/messaging.integration.new.test.ts __tests__/integration/messaging.integration.test.ts

echo "Files updated successfully!"
