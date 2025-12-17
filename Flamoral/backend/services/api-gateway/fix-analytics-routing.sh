#!/bin/bash

# Fix Analytics Controller Routing Issue
# The API Gateway has a global prefix of /api/v1, so controllers need an api/ prefix
# to create routes like /api/v1/api/analytics instead of /api/v1/analytics

echo "Fixing analytics controller routing..."

# Fix analytics controller
sed -i "s/@Controller('analytics')/@Controller('api\/analytics')/g" src/controllers/analytics.controller.ts

# Fix other controllers that may have the same issue
sed -i "s/@Controller('users')/@Controller('api\/users')/g" src/controllers/user.controller.ts
sed -i "s/@Controller('profiles')/@Controller('api\/profiles')/g" src/controllers/profiles.controller.ts
sed -i "s/@Controller('notifications')/@Controller('api\/notifications')/g" src/controllers/notification.controller.ts
sed -i "s/@Controller('moderation')/@Controller('api\/moderation')/g" src/controllers/moderation.controller.ts
sed -i "s/@Controller('media')/@Controller('api\/media')/g" src/controllers/media.controller.ts

echo "Routing fixes complete!"
echo "Controllers now use 'api/' prefix to match /api/v1/api/* pattern"
