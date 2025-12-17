#!/bin/bash

# Fix serviceAuthMiddleware import in csam.routes.ts
sed -i 's/import { serviceAuthMiddleware }/import { authenticateService as serviceAuthMiddleware }/g' src/routes/csam.routes.ts

# Fix ContentType.IMAGE usage in internal.routes.ts
sed -i "s/contentType: 'image'/contentType: ContentType.IMAGE/g" src/routes/internal.routes.ts

# Add ContentType import to internal.routes.ts
sed -i '4a import { ContentType } from '"'"'../types'"'"';' src/routes/internal.routes.ts

# Fix snake_case to camelCase in internal.routes.ts
sed -i 's/permanently_banned/permanentlyBanned/g' src/routes/internal.routes.ts
sed -i 's/total_violations/totalViolations/g' src/routes/internal.routes.ts
sed -i 's/severe_violations/severeViolations/g' src/routes/internal.routes.ts
sed -i 's/warnings_issued/warningsIssued/g' src/routes/internal.routes.ts
sed -i 's/suspension_count/suspensionCount/g' src/routes/internal.routes.ts

# Fix snake_case to camelCase in moderation.service.ts
sed -i 's/\.permanently_banned/.permanentlyBanned/g' src/services/moderation.service.ts
sed -i 's/\.current_suspension_ends_at/.currentSuspensionEndsAt/g' src/services/moderation.service.ts

# Fix createdAt in moderation.service.ts - replace with flaggedAt
sed -i 's/createdAt: new Date()/flaggedAt: new Date()/g' src/services/moderation.service.ts

echo "Errors fixed!"
