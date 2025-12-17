#!/usr/bin/env python3
import os
import re

# Base directory
base_dir = r"C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\backend\services\moderation-service\src"

# Fix 1: csam.routes.ts - Fix serviceAuthMiddleware import
file_path = os.path.join(base_dir, "routes", "csam.routes.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(
    "import { serviceAuthMiddleware } from '../middleware/service-auth.middleware';",
    "import { authenticateService as serviceAuthMiddleware } from '../middleware/service-auth.middleware';"
)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 2: internal.routes.ts - Add ContentType import and fix usage
file_path = os.path.join(base_dir, "routes", "internal.routes.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add import after line 4
if "import { ContentType } from '../types';" not in ''.join(lines):
    lines.insert(4, "import { ContentType } from '../types';\n")

content = ''.join(lines)
content = content.replace("contentType: 'image'", "contentType: ContentType.IMAGE")
content = content.replace("permanently_banned", "permanentlyBanned")
content = content.replace("total_violations", "totalViolations")
content = content.replace("severe_violations", "severeViolations")
content = content.replace("warnings_issued", "warningsIssued")
content = content.replace("suspension_count", "suspensionCount")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 3: moderation.service.ts - Fix snake_case properties and createdAt
file_path = os.path.join(base_dir, "services", "moderation.service.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'record\.permanently_banned', 'record.permanentlyBanned', content)
content = re.sub(r'record\.current_suspension_ends_at', 'record.currentSuspensionEndsAt', content)
content = re.sub(r"createdAt: new Date\(\),\n(\s+)updatedAt: new Date\(\),", r"flaggedAt: new Date(),", content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 4: config/index.ts - Fix ncmecReportingThreshold
file_path = os.path.join(base_dir, "config", "index.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The threshold is already in the config at line 142, so this might not be an actual error
# Let's check if it exists
if 'ncmecReportingThreshold' in content:
    print(f"ncmecReportingThreshold already exists in config")
else:
    print(f"Warning: ncmecReportingThreshold not found in config")

print("\nAll fixes applied!")
