# Database Seeds

This directory contains seed data for Phase 1 monetization and safety features.

## Seed Files

1. **01_coin_products.ts** - Coin packages (Small, Medium, Large, XL)
2. **02_boost_products.ts** - Profile boost options (30min, 1hr, 3hr)
3. **03_report_categories.ts** - User report categories (10 types)
4. **04_subscription_features.ts** - Features for each subscription tier (Free, Basic, Mid, Ultra)

## Running Seeds

### Run all seeds:
```bash
npx knex seed:run
```

### Run specific seed:
```bash
npx knex seed:run --specific=01_coin_products.ts
```

## Seed Data Overview

### Coin Products (4 packages)
- **Small**: 100 coins for $4.99
- **Medium**: 500 coins + 50 bonus for $19.99
- **Large**: 1200 coins + 300 bonus for $39.99 (Popular)
- **XL**: 2500 coins + 625 bonus for $74.99

### Boost Products (3 options)
- **30 Minutes**: $4.99 or 50 coins
- **1 Hour**: $7.99 or 80 coins (Popular)
- **3 Hours**: $14.99 or 150 coins

### Report Categories (10 types)
- Inappropriate Photos
- Inappropriate Messages
- Fake Profile
- Spam
- Harassment
- Underage User
- Scam or Fraud
- Violence or Threats
- Hate Speech
- Other

### Subscription Features (16 features × 4 tiers = 64 records)

#### Feature Keys:
- `daily_swipes_limit` - Daily swipe limit
- `daily_likes_limit` - Daily like limit
- `see_who_liked_you` - See who liked you
- `advanced_filters` - Advanced search filters
- `incognito_mode` - Anonymous browsing
- `super_likes_per_day` - Super likes per day
- `rewinds_per_day` - Rewind swipes per day
- `boosts_per_month` - Free boosts per month
- `priority_likes` - Priority in others' feeds
- `read_receipts` - Message read receipts
- `no_ads` - Ad-free experience
- `profile_boost` - Automatic visibility boost
- `vip_badge` - VIP badge display
- `unlimited_rewinds` - Unlimited rewinds
- `unlimited_super_likes` - Unlimited super likes
- `early_access` - Early feature access

#### Tier Comparison:

| Feature | Free | Basic ($9.99) | Mid ($19.99) | Ultra ($29.99) |
|---------|------|---------------|--------------|----------------|
| Daily Swipes | 10 | Unlimited | Unlimited | Unlimited |
| Daily Likes | 5 | Unlimited | Unlimited | Unlimited |
| See Who Liked | ❌ | ✅ | ✅ | ✅ |
| Advanced Filters | ❌ | ✅ | ✅ | ✅ |
| Incognito Mode | ❌ | ❌ | ✅ | ✅ |
| Super Likes/Day | 0 | 5 | 10 | Unlimited |
| Rewinds/Day | 0 | 0 | 3 | Unlimited |
| Boosts/Month | 0 | 0 | 1 | 2 |
| Priority Likes | ❌ | ✅ | ✅ | ✅ |
| Read Receipts | ❌ | ✅ | ✅ | ✅ |
| No Ads | ❌ | ❌ | ✅ | ✅ |
| Profile Boost | ❌ | ❌ | ❌ | ✅ |
| VIP Badge | ❌ | ❌ | ❌ | ✅ |
| Early Access | ❌ | ❌ | ❌ | ✅ |

## Important Notes

### Stripe Price IDs
Before deploying to production, replace the placeholder Stripe price IDs in the seed files with actual Stripe price IDs:

- `price_coin_pack_small` → Create in Stripe Dashboard
- `price_coin_pack_medium` → Create in Stripe Dashboard
- `price_coin_pack_large` → Create in Stripe Dashboard
- `price_coin_pack_xl` → Create in Stripe Dashboard
- `price_boost_30min` → Create in Stripe Dashboard
- `price_boost_1hr` → Create in Stripe Dashboard
- `price_boost_3hr` → Create in Stripe Dashboard

### Creating Stripe Products

1. Go to Stripe Dashboard → Products
2. Create a product for each coin pack and boost
3. Add a price for each product
4. Copy the price ID (starts with `price_`)
5. Update the seed files with real price IDs

### Feature Value Types
- **integer**: Numeric values (-1 = unlimited)
- **boolean**: true/false values
- **string**: Text values

### Seeding Order
Seeds run in alphabetical order by filename. The current order is:
1. Coin products (no dependencies)
2. Boost products (no dependencies)
3. Report categories (no dependencies)
4. Subscription features (no dependencies)

All seeds are independent and can run in any order.

## Testing Seeds

After running seeds, verify the data:

```sql
-- Check coin products
SELECT sku, name, amount, bonus_coins, price FROM coin_products ORDER BY display_order;

-- Check boost products
SELECT sku, name, duration_minutes, price, coin_cost FROM boost_products ORDER BY display_order;

-- Check report categories
SELECT type, label FROM report_categories ORDER BY display_order;

-- Check subscription features by tier
SELECT tier, feature_key, feature_value
FROM subscription_features
WHERE tier = 'ultra'
ORDER BY feature_key;

-- Count features per tier
SELECT tier, COUNT(*) as feature_count
FROM subscription_features
GROUP BY tier;
```

## Modifying Seeds

To modify seed data:

1. Edit the appropriate seed file
2. Run `npx knex seed:run` to re-seed
3. Note: Seeds delete existing data before inserting

## Production Deployment

Before deploying to production:

1. ✅ Update all Stripe price IDs
2. ✅ Review and adjust pricing
3. ✅ Review feature limits
4. ✅ Test all seeds in staging environment
5. ✅ Backup database before running seeds
6. ✅ Run seeds with proper database credentials
