#!/usr/bin/env python3
"""
Fix test files for moderation service
"""
import os
import re

# Fix file 1: tests/unit/services/moderation.service.test.ts
file1_path = r'C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/moderation-service/tests/unit/services/moderation.service.test.ts'

print(f"Fixing {file1_path}...")
with open(file1_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Replace ViolationType.SUGGESTIVE] with ViolationType.SUGGESTIVE_NUDITY]
content = content.replace('ViolationType.SUGGESTIVE]', 'ViolationType.SUGGESTIVE_NUDITY]')

with open(file1_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed {file1_path}")

# Fix file 2: src/tests/moderation.service.test.ts
file2_path = r'C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/moderation-service/src/tests/moderation.service.test.ts'

print(f"Fixing {file2_path}...")
with open(file2_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix duplicate recommendations
fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Check for duplicate recommendations
    if 'recommendations: [],' in line and i+1 < len(lines) and 'recommendations: [],' in lines[i+1]:
        fixed_lines.append(line)  # Keep first one
        i += 2  # Skip duplicate
    # Fix commented code blocks that have syntax errors
    elif i >= 249 and i <= 258:  # Lines 250-259 (0-indexed: 249-258)
        if '// await moderationService' in line or line.strip().startswith('//'):
            fixed_lines.append(line)
        else:
            fixed_lines.append('      // ' + line.lstrip())
        i += 1
    elif i >= 279 and i <= 288:  # Lines 280-289 (0-indexed: 279-288)
        if '// await moderationService' in line or line.strip().startswith('//'):
            fixed_lines.append(line)
        else:
            fixed_lines.append('      // ' + line.lstrip())
        i += 1
    elif i >= 310 and i <= 319:  # Lines 311-320 (0-indexed: 310-319)
        if '// await moderationService' in line or line.strip().startswith('//'):
            fixed_lines.append(line)
        else:
            fixed_lines.append('      // ' + line.lstrip())
        i += 1
    else:
        fixed_lines.append(line)
        i += 1

with open(file2_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print(f"Fixed {file2_path}")
print("All fixes applied successfully!")
