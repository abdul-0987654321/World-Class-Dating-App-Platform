with open('src/services/icebreaker.service.ts', 'rb') as f:
    lines = f.readlines()

if len(lines) > 28:
    line_bytes = lines[28]  # Line 29 (0-indexed)
    print("Line 29 (raw bytes):")
    print(line_bytes)
    print("\nDecoded:")
    print(line_bytes.decode('utf-8'))
    print("\nHex dump:")
    print(' '.join(f'{b:02x}' for b in line_bytes))

    # Check for quote characters specifically
    print("\nQuote characters:")
    text = line_bytes.decode('utf-8')
    for i, char in enumerate(text):
        if char in ["'", '"', ''', ''', '"', '"']:
            print(f"  Position {i}: {repr(char)} (U+{ord(char):04X})")
