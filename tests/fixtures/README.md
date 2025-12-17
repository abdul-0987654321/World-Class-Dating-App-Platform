# Development Fixtures

This directory contains seed data for local development and testing.

## Files

- **users.json** - Sample user accounts with various subscription tiers
- **profiles.json** - User profiles with complete information
- **matches.json** - Sample matches between users
- **messages.json** - Conversation messages

## Test Accounts

### Regular Users

| Email | Password | Subscription | Description |
|-------|----------|--------------|-------------|
| sarah.johnson@example.com | password123 | Premium | Complete profile, verified |
| mike.chen@example.com | password123 | Free | Software engineer, SF |
| emily.rodriguez@example.com | password123 | Premium+ | Artist, LA |
| james.wilson@example.com | password123 | Free | Personal trainer, LA |

### Admin Account

| Email | Password | Role |
|-------|----------|------|
| admin@flamoral.com | admin123 | Admin |

## Usage

### Seeding the Database

```bash
# From project root
yarn seed

# Or manually
ts-node scripts/seed-data.ts
```

### Using in Development

The seed data is automatically loaded when you run:

```bash
yarn setup:dev
```

This will:
1. Install all dependencies
2. Seed the database
3. Start all services (database, Redis, backend, etc.)

## Data Structure

### Users
- 5 total users (4 regular + 1 admin)
- Mix of free, premium, and premium+ subscriptions
- All have verified emails
- Various verification statuses

### Profiles
- Complete profile information
- Multiple interests and lifestyle indicators
- Profile prompts with answers
- Geolocation data (LA & SF areas)

### Matches
- 3 active matches
- Recent conversations
- Mix of read/unread messages

### Messages
- Sample conversation flows
- Text messages only (image/GIF support coming soon)
- Realistic timestamps

## Customization

To add more test data:

1. Edit the JSON files in this directory
2. Re-run the seed script
3. The script will clear existing test data and load new fixtures

## Notes

- All passwords are hashed with bcrypt in the database
- Timestamps use ISO 8601 format
- Coordinates are [longitude, latitude] for GeoJSON compatibility
- IDs use prefixes (user-, profile-, match-, msg-) for clarity
