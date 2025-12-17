import time

# Read the file
with open('two-factor-auth.service.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and add imports
for i, line in enumerate(lines):
    if line.strip() == "import logger from '../../utils/logger';":
        # Insert new imports after logger import
        lines.insert(i + 1, "import twilioService from '../../infrastructure/sms/twilio.service';\n")
        lines.insert(i + 2, "import emailService from '../../infrastructure/email/email.service';\n")
        break

# Write back
time.sleep(0.5)
with open('two-factor-auth.service.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Added imports successfully!")
