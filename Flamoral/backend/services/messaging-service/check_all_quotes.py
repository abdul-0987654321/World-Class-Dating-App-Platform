import re

with open('src/services/icebreaker.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Check for smart quotes and other special characters
smart_quotes = {
    '\u2018': "'",  # Left single quotation mark
    '\u2019': "'",  # Right single quotation mark
    '\u201C': '"',  # Left double quotation mark
    '\u201D': '"',  # Right double quotation mark
    '\u2013': '-',  # En dash
    '\u2014': '-',  # Em dash
}

found_issues = False
for line_num, line in enumerate(lines, 1):
    for char in line:
        if char in smart_quotes:
            found_issues = True
            print(f"Line {line_num}: Found {repr(char)} (U+{ord(char):04X})")
            print(f"  Context: {line.strip()[:80]}")

if not found_issues:
    print("No smart quotes or special characters found")

# Also check for any non-ASCII characters
print("\nChecking for other non-ASCII characters...")
for line_num, line in enumerate(lines, 1):
    for i, char in enumerate(line):
        code = ord(char)
        if code > 127 and code not in [0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014]:
            # Likely emoji or other special chars
            if code > 0x1F000:  # Emoji range
                print(f"Line {line_num}, pos {i}: Emoji {repr(char)} (U+{code:04X})")
                print(f"  Context: {line.strip()[:80]}")
