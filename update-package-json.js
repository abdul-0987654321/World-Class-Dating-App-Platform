const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update docker-compose script references
packageJson.scripts['setup:dev'] = 'yarn install && docker-compose -f infrastructure/local-dev/docker-compose.yml up -d';
packageJson.scripts['docker:up'] = 'docker-compose -f infrastructure/local-dev/docker-compose.yml up -d';
packageJson.scripts['docker:down'] = 'docker-compose -f infrastructure/local-dev/docker-compose.yml down';
packageJson.scripts['docker:rebuild'] = 'docker-compose -f infrastructure/local-dev/docker-compose.yml down && docker-compose -f infrastructure/local-dev/docker-compose.yml build && docker-compose -f infrastructure/local-dev/docker-compose.yml up -d';
packageJson.scripts['docker:test:up'] = 'docker-compose -f infrastructure/local-dev/docker-compose.test.yml up -d --wait';
packageJson.scripts['docker:test:down'] = 'docker-compose -f infrastructure/local-dev/docker-compose.test.yml down -v';
packageJson.scripts['docker:test:logs'] = 'docker-compose -f infrastructure/local-dev/docker-compose.test.yml logs -f';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('package.json updated successfully');
