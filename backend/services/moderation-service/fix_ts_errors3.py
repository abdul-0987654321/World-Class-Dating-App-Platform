#!/usr/bin/env python3
import os
import re

base_dir = r"C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\backend\services\moderation-service\src"

# Fix 1: staff-notification.service.ts - Type the stats variable
file_path = os.path.join(base_dir, "services", "staff-notification.service.ts")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the stats declaration and add type annotation
content = re.sub(
    r'(const stats = await db\(\'csam_detection_logs\'\).*?\.first\(\);)',
    r'\1\n      const statsData: any = stats;',
    content,
    flags=re.DOTALL
)

# Replace stats? with statsData
content = content.replace('stats?.total_scans', 'statsData?.total_scans')
content = content.replace('stats?.detections', 'statsData?.detections')
content = content.replace('stats?.avg_confidence', 'statsData?.avg_confidence')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Fixed: {file_path}")

# Fix 2: tests/moderation.service.test.ts - Add recommendations property and fix ViolationType
test_file_path = os.path.join(base_dir, "tests", "moderation.service.test.ts")
if os.path.exists(test_file_path):
    with open(test_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add recommendations: [] to all ImageModerationResult mocks
    content = re.sub(
        r'(detectedViolations:\s*\[.*?\]\s*)(}\s*\))',
        r'\1,\n      recommendations: []\n\2',
        content
    )

    # Fix profanity property - should be profanityScore
    content = content.replace('profanity:', 'profanityScore:')

    # Fix ViolationType.SUGGESTIVE -> ViolationType.SUGGESTIVE_NUDITY
    content = content.replace('ViolationType.SUGGESTIVE', 'ViolationType.SUGGESTIVE_NUDITY')

    # Fix ViolationType.WEAPONS -> ViolationType.VIOLENCE (weapons is not in the enum)
    content = content.replace('ViolationType.WEAPONS', 'ViolationType.VIOLENCE')

    with open(test_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed: {test_file_path}")
else:
    print(f"Warning: {test_file_path} not found")

print("\nAll test fixes applied!")
