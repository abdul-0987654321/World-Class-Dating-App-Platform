with open('src/services/icebreaker.service.ts', 'rb') as f:
    content = f.read()

text = content.decode('utf-8')
lines = text.split('\n')

print("Scanning for smart quotes and unusual characters...")

# Check for smart quotes
smart_quote_chars = {
    0x2018: 'LEFT SINGLE QUOTATION MARK',
    0x2019: 'RIGHT SINGLE QUOTATION MARK',
    0x201C: 'LEFT DOUBLE QUOTATION MARK',
    0x201D: 'RIGHT DOUBLE QUOTATION MARK',
}

found_issues = []
for line_num, line in enumerate(lines, 1):
    for i, char in enumerate(line):
        code = ord(char)
        if code in smart_quote_chars:
            found_issues.append((line_num, i, char, smart_quote_chars[code]))
            print(f"Line {line_num}, col {i}: {repr(char)} ({smart_quote_chars[code]})")
            print(f"  Context: ...{line[max(0, i-20):i+20]}...")

if not found_issues:
    print("No smart quotes found!")

# Also check for unusual apostrophes in strings
print("\nChecking for strings with apostrophes...")
import re
pattern = re.compile(r"text:\s*['\"]([^'\"]*)['\"]")
for line_num, line in enumerate(lines, 1):
    match = pattern.search(line)
    if match and "'" in match.group(1):  # apostrophe in text
        # Check if it's ASCII apostrophe
        text_part = match.group(1)
        for char in text_part:
            if char == "'":
                code = ord(char)
                if code != 0x27:
                    print(f"Line {line_num}: Non-ASCII apostrophe in text: {repr(text_part)}")
                    break
