import os
import re

def get_relative_path(filepath):
    """Calculate relative path from file to utils/logger.ts"""
    # Count directory depth from src/
    parts = filepath.replace('\\', '/').split('/')
    src_index = parts.index('src') if 'src' in parts else 0
    depth = len(parts) - src_index - 2  # -2 for src and filename

    if depth == 0:
        return './utils/logger'
    else:
        return '../' * depth + 'utils/logger'

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    relative_path = get_relative_path(filepath)

    # Replace the import statement
    content = re.sub(
        r"import\s+{\s*createLogger\s*}\s+from\s+['\"]@flamoral/shared['\"];?",
        f"import {{ createLogger }} from '{relative_path}';",
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# List of files that need updating
files_to_update = [
    'src/index.ts',
    'src/infrastructure/database/cosmos-optimized.ts',
    'src/api/controllers/enhanced-messaging.controller.ts',
    'src/services/icebreaker.service.ts',
    'src/socket/socket-manager.ts',
    'src/services/chat-export.service.ts',
    'src/services/photo-sharing.service.ts',
    'src/services/voice-message.service.ts',
    'src/services/gif-integration.service.ts',
    'src/services/message-search.service.ts',
    'src/services/pinned-messages.service.ts',
    'src/services/enhanced-reactions.service.ts',
    'src/domain/repositories/conversation.repository.ts',
    'src/domain/repositories/message.repository.ts',
    'src/services/message-reactions.service.ts',
    'src/services/key-management.service.ts',
    'src/infrastructure/database/cosmos-client.ts',
    'src/infrastructure/cache/redis.ts',
    'src/infrastructure/clients/matching-service.client.ts',
    'src/infrastructure/clients/realtime-http.client.ts',
    'src/infrastructure/clients/realtime.client.ts',
    'src/infrastructure/database/cosmos.ts',
    'src/infrastructure/database/encryption-init.ts',
    'src/domain/services/message-events.service.ts',
    'src/domain/services/encryption.service.ts',
    'src/domain/services/message-encryption-handler.service.ts',
    'src/api/controllers/conversation-typing.controller.ts',
    'src/api/controllers/conversation.controller.ts',
    'src/api/controllers/encryption-keys.controller.ts',
    'src/api/controllers/message.controller.ts',
    'src/api/controllers/read-receipt.controller.ts',
    'src/api/middleware/auth.middleware.ts',
]

updated_count = 0
for filepath in files_to_update:
    if os.path.exists(filepath):
        if replace_in_file(filepath):
            print(f'Updated: {filepath}')
            updated_count += 1
    else:
        print(f'Not found: {filepath}')

print(f'\nTotal files updated: {updated_count}')
