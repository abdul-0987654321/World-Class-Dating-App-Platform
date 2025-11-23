# ConnectSphere API Testing Guide

## Access the Swagger UI
**URL:** http://localhost:3001/api-docs/

---

## Test User Credentials

All test users have the same password: **Test@123**

### Available Test Users:

| Name | Email | Gender | Occupation | City |
|------|-------|--------|------------|------|
| David Kim | `david.kim@example.com` | Male | Software Engineer | San Francisco |
| Jessica Taylor | `jessica.taylor@example.com` | Female | Marketing Manager | Los Angeles |
| Ryan Martinez | `ryan.martinez@example.com` | Male | Fitness Coach | Miami |
| Ashley Brown | `ashley.brown@example.com` | Female | Elementary Teacher | Chicago |
| Kevin Wilson | `kevin.wilson@example.com` | Male | Architect | Seattle |
| Lauren Davis | `lauren.davis@example.com` | Female | Graphic Designer | Austin |
| Chris Anderson | `chris.anderson@example.com` | Male | Data Scientist | Boston |

**Password for all users:** `Test@123`

---

## Quick Start: Testing with Swagger UI

### Step 1: Open Swagger UI
Navigate to: http://localhost:3001/api-docs/

### Step 2: Authenticate

1. **Scroll down to the "Authentication" section**
2. **Click on `POST /api/auth/login`**
3. **Click "Try it out"**
4. **Enter credentials:**
   ```json
   {
     "email": "david.kim@example.com",
     "password": "Test@123"
   }
   ```
5. **Click "Execute"**
6. **Copy the JWT token from the response** (under `data.token`)

### Step 3: Authorize Swagger UI

1. **Click the "Authorize" button** (top right, with a lock icon)
2. **In the "Value" field, enter:** `Bearer YOUR_JWT_TOKEN`
   - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Make sure to include the word "Bearer" before the token
3. **Click "Authorize"**
4. **Click "Close"**

### Step 4: Test Any Protected Endpoint

Now you can test any authenticated endpoint! Examples:

- **Get your profile:** `GET /api/users/profile`
- **Get coin balance:** `GET /api/coins/balance`
- **Get subscription details:** `GET /api/subscriptions/current`
- **Update privacy settings:** `PUT /api/privacy/settings`

---

## Testing Scenarios

### 1. Testing Authentication Flow

**Register a new user:**
```bash
POST /api/auth/register
{
  "email": "newuser@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1995-05-15",
  "gender": "male"
}
```

**Login:**
```bash
POST /api/auth/login
{
  "email": "newuser@example.com",
  "password": "SecurePass@123"
}
```

### 2. Testing Subscription Management

**Get current subscription:**
```bash
GET /api/subscriptions/current
```

**Get available subscription tiers:**
```bash
GET /api/subscriptions/tiers
```

**Get features for current tier:**
```bash
GET /api/subscriptions/features
```

### 3. Testing Coin System

**Get coin balance:**
```bash
GET /api/coins/balance
```

**Get available coin packages:**
```bash
GET /api/coins/products
```

**Get transaction history:**
```bash
GET /api/coins/transactions
```

### 4. Testing Boost System

**Purchase a boost:**
```bash
POST /api/boosts/purchase
{
  "productSku": "BOOST_1HR"
}
```

**Get active boosts:**
```bash
GET /api/boosts/active
```

**Get boost history:**
```bash
GET /api/boosts/history
```

### 5. Testing Privacy & Safety

**Get privacy settings:**
```bash
GET /api/privacy/settings
```

**Update privacy settings:**
```bash
PUT /api/privacy/settings
{
  "showAge": false,
  "showDistance": true,
  "onlineStatus": "hidden"
}
```

**Block a user:**
```bash
POST /api/blocks
{
  "blockedId": "USER_ID_TO_BLOCK"
}
```

**Report a user:**
```bash
POST /api/reports
{
  "reportedId": "USER_ID_TO_REPORT",
  "reportType": "inappropriate_photos",
  "description": "Optional description"
}
```

---

## Using cURL for Testing

If you prefer command-line testing:

### 1. Login and Get Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "david.kim@example.com",
    "password": "Test@123"
  }'
```

### 2. Use Token for Authenticated Requests
```bash
# Replace YOUR_TOKEN with the actual JWT token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get profile
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Get coin balance
curl -X GET http://localhost:3001/api/coins/balance \
  -H "Authorization: Bearer $TOKEN"

# Get subscription
curl -X GET http://localhost:3001/api/subscriptions/current \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing Different Subscription Tiers

To test tier-specific features, you'll need to update a user's subscription tier:

### Available Tiers:
- **FREE** - Default tier, limited features
- **BASIC** - $9.99/month, enhanced features
- **MID** - $19.99/month, premium features
- **ULTRA** - $29.99/month, all features unlocked

### Tier Comparison:

| Feature | FREE | BASIC | MID | ULTRA |
|---------|------|-------|-----|-------|
| Daily Swipes | 50 | 100 | Unlimited | Unlimited |
| Daily Likes | 10 | 50 | Unlimited | Unlimited |
| Daily Super Likes | 1 | 3 | 5 | Unlimited |
| Rewinds | 0 | 3/day | 5/day | Unlimited |
| Boosts | 0 | 1/month | 2/month | Unlimited |
| Profile Visibility | Standard | High | Higher | Highest |
| Ad-Free | ❌ | ✅ | ✅ | ✅ |
| Advanced Filters | ❌ | ✅ | ✅ | ✅ |
| See Who Liked You | ❌ | ❌ | ✅ | ✅ |
| Incognito Mode | ❌ | ❌ | ✅ | ✅ |
| Read Receipts | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

---

## Testing Coin Purchases

### Available Coin Packages:

| Package | Coins | Price | Bonus |
|---------|-------|-------|-------|
| COIN_PACK_SMALL | 100 | $4.99 | - |
| COIN_PACK_MEDIUM | 500 | $19.99 | +50 bonus |
| COIN_PACK_LARGE | 1200 | $39.99 | +200 bonus |
| COIN_PACK_MEGA | 3000 | $79.99 | +500 bonus |

### Coin Usage:
- **Super Like:** 5 coins
- **Boost (1hr):** 50 coins
- **Boost (3hr):** 120 coins
- **Boost (8hr):** 300 coins
- **Rewind:** 10 coins

---

## Common Testing Workflows

### Workflow 1: New User Registration → Profile Setup
1. Register new user (`POST /api/auth/register`)
2. Login (`POST /api/auth/login`)
3. Get profile (`GET /api/users/profile`)
4. Update profile (`PUT /api/users/profile`)
5. Upload photos (`POST /api/users/photos`)

### Workflow 2: Upgrade Subscription
1. Login as test user
2. Get current subscription (`GET /api/subscriptions/current`)
3. View available tiers (`GET /api/subscriptions/tiers`)
4. Check tier features (`GET /api/subscriptions/features`)

### Workflow 3: Purchase & Use Boost
1. Login as test user
2. Get coin balance (`GET /api/coins/balance`)
3. Purchase coins if needed
4. Get boost products (`GET /api/boosts/products`)
5. Purchase boost (`POST /api/boosts/purchase`)
6. Check active boosts (`GET /api/boosts/active`)

### Workflow 4: Privacy & Safety
1. Login as test user
2. Get privacy settings (`GET /api/privacy/settings`)
3. Update privacy settings (`PUT /api/privacy/settings`)
4. Block another user (`POST /api/blocks`)
5. Report inappropriate behavior (`POST /api/reports`)

---

## Troubleshooting

### Issue: "Unauthorized" Error
**Solution:** Make sure you've:
1. Successfully logged in and received a token
2. Clicked "Authorize" in Swagger UI
3. Entered the token as `Bearer YOUR_TOKEN` (with space after Bearer)

### Issue: "Invalid Token" Error
**Solution:** The token may have expired. Login again to get a fresh token.

### Issue: "Insufficient Coins" Error
**Solution:** Use the internal API to grant coins to your test user for testing purposes.

### Issue: Can't See Swagger UI
**Solution:**
1. Make sure the server is running on port 3001
2. Check server logs for errors
3. Navigate to http://localhost:3001/api-docs/ (note the trailing slash)

---

## Additional Resources

- **API Documentation:** http://localhost:3001/api-docs/
- **Server Status:** Check console logs where `npm run dev` is running
- **Database:** PostgreSQL running in Docker on port 5432

---

## Support

If you encounter any issues:
1. Check the server logs in your terminal
2. Verify the database is running: `docker-compose ps`
3. Check for TypeScript compilation errors
4. Restart the server: Kill nodemon and run `npm run dev` again
