import re

with open('src/services/icebreaker.service.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check line 29 (index 28)
if len(lines) > 28:
    line = lines[28]
    print(f"Line 29: {repr(line)}")
    print(f"Character codes: {[hex(ord(c)) for c in line]}")

    # Check for smart quotes or other special characters
    for i, char in enumerate(line):
        code = ord(char)
        if code > 127:  # Non-ASCII
            print(f"Position {i}: {repr(char)} (code: {hex(code)})")
