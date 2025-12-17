with open('src/services/icebreaker.service.ts', 'rb') as f:
    lines = f.readlines()

# Check line 22 (index 21)
if len(lines) > 21:
    line_bytes = lines[21]
    print("Line 22 (raw):")
    print(line_bytes)
    print("\nHex dump:")
    print(' '.join(f'{b:02x}' for b in line_bytes))

    text = line_bytes.decode('utf-8')
    print(f"\nText: {repr(text)}")

    print("\nAll quote-like characters:")
    for i, char in enumerate(text):
        code = ord(char)
        if code in [0x27, 0x22, 0x2018, 0x2019, 0x201C, 0x201D]:
            print(f"  Position {i}: {repr(char)} (U+{code:04X}) - {['APOSTROPHE', 'QUOTATION MARK', 'LEFT SINGLE QUOTE', 'RIGHT SINGLE QUOTE', 'LEFT DOUBLE QUOTE', 'RIGHT DOUBLE QUOTE'][[0x27, 0x22, 0x2018, 0x2019, 0x201C, 0x201D].index(code)]}")
