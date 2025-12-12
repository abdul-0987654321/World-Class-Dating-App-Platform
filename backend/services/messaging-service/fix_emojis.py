import re
import sys

# Set stdout encoding to UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/services/icebreaker.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Find and replace emojis
emoji_replacements = {
    '\u2615': '',  # Coffee emoji
    '\U0001f436': '',  # Dog emoji
    '\U0001f431': '',  # Cat emoji
    '\U0001f305': '',  # Sunrise emoji
    '\U0001f319': '',  # Crescent moon emoji
    '\U0001f3d6': '',  # Beach emoji
    '\u26f0': '',  # Mountain emoji
    # Add more as needed
}

for emoji, replacement in emoji_replacements.items():
    content = content.replace(emoji, replacement)

# Also remove any remaining high Unicode characters (emojis)
# Keep only printable ASCII and common Unicode characters
def clean_emoji(match):
    char = match.group(0)
    code = ord(char)
    # If it's an emoji (high Unicode), remove it
    if code > 0x1F000:
        return ''
    return char

content = re.sub(r'[^\x00-\x7F]', clean_emoji, content)

if content != original:
    with open('src/services/icebreaker.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Removed emojis from icebreaker.service.ts")
else:
    print("No changes needed")
