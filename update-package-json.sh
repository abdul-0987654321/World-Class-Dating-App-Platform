#!/bin/bash
# Update package.json to reference new docker-compose locations

sed -i 's|"setup:dev": "yarn install && docker-compose up -d"|"setup:dev": "yarn install \&\& docker-compose -f infrastructure/local-dev/docker-compose.yml up -d"|g' package.json
sed -i 's|"docker:up": "docker-compose up -d"|"docker:up": "docker-compose -f infrastructure/local-dev/docker-compose.yml up -d"|g' package.json
sed -i 's|"docker:down": "docker-compose down"|"docker:down": "docker-compose -f infrastructure/local-dev/docker-compose.yml down"|g' package.json
sed -i 's|"docker:rebuild": "docker-compose down && docker-compose build && docker-compose up -d"|"docker:rebuild": "docker-compose -f infrastructure/local-dev/docker-compose.yml down \&\& docker-compose -f infrastructure/local-dev/docker-compose.yml build \&\& docker-compose -f infrastructure/local-dev/docker-compose.yml up -d"|g' package.json
sed -i 's|"docker:test:up": "docker-compose -f docker-compose.test.yml up -d --wait"|"docker:test:up": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml up -d --wait"|g' package.json
sed -i 's|"docker:test:down": "docker-compose -f docker-compose.test.yml down -v"|"docker:test:down": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml down -v"|g' package.json
sed -i 's|"docker:test:logs": "docker-compose -f docker-compose.test.yml logs -f"|"docker:test:logs": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml logs -f"|g' package.json
