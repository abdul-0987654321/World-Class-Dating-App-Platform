#!/usr/bin/env python3
# Read the file in binary mode and convert to clean UTF-8

with open('src/services/icebreaker.service.ts', 'rb') as f:
    content = f.read()

# Decode and clean
text = content.decode('utf-8', errors='ignore')

# Normalize line endings to LF
text = text.replace('\r\n', '\n').replace('\r', '\n')

# Write back with clean UTF-8 encoding and LF line endings
with open('src/services/icebreaker.service.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print("File cleaned and normalized")
