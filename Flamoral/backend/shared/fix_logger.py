#!/usr/bin/env python3
import os

file_path = r"C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\backend\shared\utils\logger.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the type error by asserting message as string
content = content.replace(
    '    sanitizedInfo.message = sanitizedInfo.message.replace(',
    '    sanitizedInfo.message = (sanitizedInfo.message as string).replace('
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed: {file_path}")
