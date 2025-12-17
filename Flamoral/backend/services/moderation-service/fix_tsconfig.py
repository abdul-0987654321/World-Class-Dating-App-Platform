#!/usr/bin/env python3
import json

file_path = r"C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\backend\services\moderation-service\tsconfig.json"

with open(file_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

config["exclude"] = ["node_modules", "dist", "tests", "src/tests", "**/*.test.ts", "**/*.spec.ts"]

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2)

print(f"Fixed: {file_path}")
