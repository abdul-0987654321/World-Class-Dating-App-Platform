import os
import re

files_to_fix = [
    'src/services/call-recording.service.ts',
    'src/socket/call-signaling.handler.ts',
    'src/services/video-call.service.ts',
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace the import
    content = re.sub(
        r"import\s+{\s*logger\s*}\s+from\s+['\"]\.\.\/infrastructure\/logger['\"];?",
        "import { createLogger } from '../utils/logger';\n\nconst logger = createLogger('service');",
        content
    )

    # Update the service name based on filename
    if 'call-recording' in filepath:
        content = content.replace("createLogger('service')", "createLogger('call-recording-service')")
    elif 'call-signaling' in filepath:
        content = content.replace("createLogger('service')", "createLogger('call-signaling')")
    elif 'video-call' in filepath:
        content = content.replace("createLogger('service')", "createLogger('video-call-service')")

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")

print("\nDone!")
