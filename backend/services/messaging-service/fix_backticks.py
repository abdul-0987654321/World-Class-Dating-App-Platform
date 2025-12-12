import re

# Read the file
with open('src/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace escaped backticks with actual backticks
content = content.replace(r'\`', '`')
# Replace escaped dollar signs with actual dollar signs
content = content.replace(r'\$', '$')

# Write back
with open('src/index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed index.ts')
