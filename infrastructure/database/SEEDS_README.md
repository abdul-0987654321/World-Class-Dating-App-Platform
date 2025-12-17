# Database Seeds Documentation

This document describes the development seed data for the Flamoral Dating Platform.

## Overview

The seed files populate the database with realistic test data for local development and testing. All seed files are located in the `seeds/` directory.

## Seed Files

### 001_dev_users_and_profiles.ts

Creates 6 test users with complete profiles.

#### Test Users

| User | Email | Password | Subscription | Location |
|------|-------|----------|--------------|----------|
| Alice Johnson | alice.johnson@example.com | Test123! | Ultra | San Francisco, CA |
| Bob Smith | bob.smith@example.com | Test123! | Mid | Los Angeles, CA |
| Carol Williams | carol.williams@example.com | Test123! | Basic | New York, NY |
| David Brown | david.brown@example.com | Test123! | Free | Austin, TX |
| Emily Davis | emily.davis@example.com | Test123! | Mid | Chicago, IL |
| Frank Miller | frank.miller@example.com | Test123! | Basic (Trial) | Seattle, WA |

#### Features

- All users have verified emails
- Mix of subscription tiers (Free, Basic, Mid, Ultra)
- Diverse geographic locations for testing proximity features
- Complete profile information (bio, occupation, interests, etc.)
- User preferences set for matching

### 002_dev_photos_and_prompts.ts

Adds photos and prompt answers for each user.

#### Photos

- Each user has 1-3 photos
- Primary photos are marked
- Some photos are verified (for testing verification features)
- Uses placeholder images from randomuser.me
- All photos have moderation status set to "approved"

#### Prompt Answers

Users have answered 2-3 profile prompts with realistic responses:

- "My ideal Sunday looks like..."
- "I geek out on..."
- "A perfect first date would be..."
- "The way to win me over is..."
- And more...

### 003_dev_matching_data.ts

Creates swipes and matches between users.

#### Swipe Patterns

- Alice: likes Bob, super-likes David, passes on Frank
- Bob: likes Alice, likes Carol, super-likes Emily
- Carol: likes Bob, passes on David, likes Frank
- David: passes on Alice, likes Carol, super-likes Emily
- Emily: passes on Bob, likes David, likes Frank
- Frank: likes Alice, passes on Carol, likes Emily

#### Matches

Four active matches are created:

1. **Alice & Bob** (87.5% compatibility) - Matched 2 days ago
2. **Bob & Carol** (92.3% compatibility) - Matched 1 day ago
3. **David & Emily** (78.9% compatibility) - Matched 3 days ago
4. **Emily & Frank** (85.0% compatibility) - Matched 5 hours ago

### 004_dev_conversations_messages.ts

Creates conversations with message history.

#### Conversations

Each match has an associated conversation with realistic message exchanges:

1. **Alice & Bob**: Planning a hiking date for Saturday
   - 6 messages exchanged over 2 days
   - Last message: 1 hour ago
   - Alice has 1 unread message

2. **Bob & Carol**: Discussing books and fitness
   - 4 messages exchanged over 1 day
   - Last message: 30 minutes ago
   - Bob has 1 unread message

3. **David & Emily**: Talking about travel and music
   - 5 messages exchanged over 3 days
   - Last message: 2 hours ago
   - David has 2 unread messages

4. **Emily & Frank**: Just started chatting
   - 1 message (Emily's opening message)
   - Last message: 10 minutes ago
   - Frank has 1 unread message

#### Message Types

- Text messages (primary type)
- Read/unread status
- Delivery status tracking
- Realistic timestamps

### 005_dev_subscriptions.ts

Creates subscription, payment methods, and transaction data.

#### Subscriptions

- **Alice**: Ultra yearly subscription ($279.99/year) - Active
- **Bob**: Mid monthly subscription ($19.99/month) - Active
- **Carol**: Basic 3-month subscription ($24.99/3 months) - Active
- **David**: Free tier - Active
- **Emily**: Mid 6-month subscription with promo ($89.99/6 months) - Active
- **Frank**: Basic monthly subscription - Trialing (7-day trial)

#### Payment Methods

Each paying user has a payment method on file:

- Alice: Visa ending in 4242
- Bob: Mastercard ending in 5555
- Carol: Amex ending in 0005
- Emily: Visa ending in 1234
- Frank: Discover ending in 6789

#### Transactions

Sample transaction history includes:

- Subscription payments
- Subscription renewals
- Coin purchases
- Boost purchases
- All with Stripe test IDs

## Running Seeds

### Run All Seeds

```bash
npm run seed:run
```

This will run all seed files in order (001, 002, 003, etc.).

### Create New Seed File

```bash
npm run seed:make seed_name
```

### Reset Database with Seeds

```bash
npm run db:reset
```

This will:
1. Rollback all migrations
2. Run all migrations
3. Run all seeds

## Important Notes

### Data Consistency

Seeds are designed to maintain referential integrity:

1. **001** must run first (creates users and profiles)
2. **002** depends on users (adds photos and prompts)
3. **003** depends on users (creates swipes and matches)
4. **004** depends on matches (creates conversations)
5. **005** depends on users and subscription plans

### Cleaning Data

Each seed file clears related data before inserting:

```typescript
await knex('table_name').del();
```

This ensures seeds can be run multiple times without conflicts.

### Production Warning

**NEVER run development seeds in production!**

Seeds are for development and testing only. They:
- Use weak passwords
- Have predictable UUIDs
- Clear existing data
- Use test Stripe IDs

## Customizing Seeds

### Adding More Users

Edit `001_dev_users_and_profiles.ts`:

```typescript
const users = [
  // ... existing users
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'new.user@example.com',
    password_hash: passwordHash,
    // ... other fields
  },
];
```

### Changing Matches

Edit `003_dev_matching_data.ts`:

```typescript
const matches = [
  // ... existing matches
  {
    id: '650e8400-e29b-41d4-a716-446655440005',
    user1_id: 'user_id_1',
    user2_id: 'user_id_2',
    status: 'active',
    compatibility_score: 90.0,
    // ... other fields
  },
];
```

### Adding Messages

Edit `004_dev_conversations_messages.ts`:

```typescript
const messages = [
  // ... existing messages
  {
    conversation_id: 'conversation_id',
    sender_id: 'sender_user_id',
    receiver_id: 'receiver_user_id',
    content: 'New message content',
    type: 'text',
    // ... other fields
  },
];
```

## Testing with Seeds

### Test Scenarios

The seed data supports testing various scenarios:

1. **Matching Algorithm**
   - Different user preferences
   - Geographic proximity (different cities)
   - Various interests and attributes

2. **Subscription Features**
   - Free tier limitations
   - Premium feature access
   - Trial periods
   - Subscription renewals

3. **Messaging**
   - Read/unread messages
   - Multiple conversations
   - Message delivery status

4. **Profile Verification**
   - Verified vs unverified users
   - Photo verification status
   - Email/phone verification

### Login Credentials

Use these credentials to test the application:

```
Email: alice.johnson@example.com
Password: Test123!

Email: bob.smith@example.com
Password: Test123!

Email: carol.williams@example.com
Password: Test123!

// ... etc (all users use password: Test123!)
```

## Maintenance

### Updating Seeds

When updating schema:

1. Update relevant migration files
2. Update corresponding seed files
3. Test seeds after migration changes:

```bash
npm run db:reset
```

### Seed Order

If you add new seed files, use the naming convention:

```
00X_descriptive_name.ts
```

Files are executed in alphabetical order.

## Best Practices

1. **Keep Seeds Simple**: Seeds should focus on creating realistic test data
2. **Maintain Relationships**: Ensure foreign key relationships are valid
3. **Use Realistic Data**: Make test data believable for better testing
4. **Document Changes**: Update this README when changing seed data
5. **Version Control**: Commit seed files to track data structure changes

## Troubleshooting

### Seed Fails with Foreign Key Error

**Cause**: Trying to insert data before referenced table is populated

**Solution**: Check seed file order. Dependencies should run first.

### Duplicate Key Error

**Cause**: Seed file ran twice without clearing data

**Solution**: Reset the database:

```bash
npm run db:reset
```

### Password Hash Error

**Cause**: bcrypt package not installed

**Solution**: Install dependencies:

```bash
npm install
```

## Future Enhancements

Potential improvements for seed data:

1. Add more diverse user profiles
2. Create seed data for gamification features
3. Add video call history
4. Create notification seed data
5. Add analytics event seeds
6. Create moderation/safety test cases

## Contributing

When adding new features:

1. Update relevant seed files
2. Maintain data consistency
3. Update this documentation
4. Test seeds thoroughly
5. Use realistic, diverse data

## Related Documentation

- [Migrations Guide](./MIGRATIONS_GUIDE.md)
- [Database Schema](./SCHEMA.md)
- [Quick Start](./QUICKSTART.md)
