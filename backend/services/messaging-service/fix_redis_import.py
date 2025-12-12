import os

filepath = 'src/services/video-call.service.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the import
content = content.replace(
    "import { RedisClient } from '../infrastructure/redis.client';",
    "import { RedisClient } from '../infrastructure/cache/redis';"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed redis import in video-call.service.ts")
