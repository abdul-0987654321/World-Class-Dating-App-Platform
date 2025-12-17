import re

with open('src/services/icebreaker.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Replace smart quotes with straight quotes
replacements = {
    '\u2018': "'",  # ' Left single quotation mark
    '\u2019': "'",  # ' Right single quotation mark
    '\u201C': '"',  # " Left double quotation mark
    '\u201D': '"',  # " Right double quotation mark
    '\u2013': '-',  # – En dash
    '\u2014': '-',  # — Em dash
}

for smart, straight in replacements.items():
    content = content.replace(smart, straight)

# Also remove any emojis (high Unicode characters)
def remove_emoji(text):
    # Remove characters in emoji ranges
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\u2615"  # Coffee
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)

content = remove_emoji(content)

if content != original:
    with open('src/services/icebreaker.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed smart quotes and emojis in icebreaker.service.ts")
    print(f"Made {len([c for c in original if c in replacements])} quote replacements")
else:
    print("No changes needed")
