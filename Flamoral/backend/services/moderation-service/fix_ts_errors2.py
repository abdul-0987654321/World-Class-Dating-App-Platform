#!/usr/bin/env python3
import os
import re

base_dir = r"C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\backend\services\moderation-service\src"

# Fix 1: csam-detection.service.ts - Use thresholds.ncmecReportingThreshold
file_path = os.path.join(base_dir, "services", "csam-detection.service.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("config.csam.ncmecReportingThreshold", "config.csam.thresholds.ncmecReportingThreshold")
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 2: moderation.service.ts - Fix flaggedAt and duplicate property
file_path = os.path.join(base_dir, "services", "moderation.service.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove flaggedAt from saveModerationLog (it's not part of ModerationLog type)
content = re.sub(r',\s*flaggedAt: new Date\(\)', '', content)

# Fix the duplicate property issue - remove one flaggedAt line if duplicated
lines = content.split('\n')
new_lines = []
prev_line = None
for line in lines:
    if 'flaggedAt: new Date()' in line and prev_line and 'flaggedAt: new Date()' in prev_line:
        # Skip duplicate flaggedAt
        continue
    new_lines.append(line)
    prev_line = line
content = '\n'.join(new_lines)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 3: staff-notification.service.ts - Fix database query properties
file_path = os.path.join(base_dir, "services", "staff-notification.service.ts")
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # These are likely database column names that need to be accessed with .first() result
    # Add type assertion or optional chaining
    content = re.sub(r'stats\.total_scans', 'stats?.total_scans || 0', content)
    content = re.sub(r'stats\.detections', 'stats?.detections || 0', content)
    content = re.sub(r'stats\.avg_confidence', 'stats?.avg_confidence || 0', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {file_path}")

print("\nAll additional fixes applied!")
