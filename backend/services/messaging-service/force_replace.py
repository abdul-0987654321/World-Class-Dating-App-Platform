import os

# Read the new content
with open('src/services/icebreaker-new.service.ts', 'r', encoding='utf-8') as f:
    new_content = f.read()

# Remove the old file if it exists
if os.path.exists('src/services/icebreaker.service.ts'):
    os.remove('src/services/icebreaker.service.ts')
    print("Removed old icebreaker.service.ts")

# Write the new content
with open('src/services/icebreaker.service.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced with new content")
