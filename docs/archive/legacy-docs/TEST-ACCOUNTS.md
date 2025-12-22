# Test Accounts - Flamoral Platform

**Created:** November 15, 2025
**Purpose:** Frontend and E2E testing
**Environment:** Development (localhost)

---

## 🧪 Test User Accounts

### Test User 1 - John Doe

**Personal Information:**
- **User ID:** `65d451f5-32d1-4059-a32e-fcab3eef1b3d`
- **Email:** `john.doe.test@example.com`
- **Password:** `SecurePass123!`
- **First Name:** John
- **Last Name:** Doe
- **Date of Birth:** January 15, 1995 (30 years old)
- **Gender:** Male
- **Phone:** +1234567890

**Account Status:**
- ✅ Registered: Yes
- ✅ Email Verified: Yes
- ❌ Phone Verified: No
- ✅ Active: Yes
- **Created:** November 16, 2025
- **Email Verified:** November 16, 2025

**Login Credentials:**
```json
{
  "email": "john.doe.test@example.com",
  "password": "SecurePass123!"
}
```

---

### Test User 2 - Jane Smith

**Personal Information:**
- **User ID:** `da5444a9-7eae-425e-9361-222553dc0750`
- **Email:** `jane.smith.test@example.com`
- **Password:** `StrongPass456!`
- **First Name:** Jane
- **Last Name:** Smith
- **Date of Birth:** May 20, 1992 (33 years old)
- **Gender:** Female
- **Phone:** +1987654321

**Account Status:**
- ✅ Registered: Yes
- ✅ Email Verified: Yes
- ❌ Phone Verified: No
- ✅ Active: Yes
- **Created:** November 16, 2025
- **Email Verified:** November 16, 2025

**Login Credentials:**
```json
{
  "email": "jane.smith.test@example.com",
  "password": "StrongPass456!"
}
```

---

## 🧪 Testing Use Cases

### Use Case 1: Standard Login Flow
**User:** John Doe
**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter email: `john.doe.test@example.com`
3. Enter password: `SecurePass123!`
4. Click "Login"
5. Should redirect to dashboard

**Expected Result:**
- ✅ Successful login
- ✅ Redirect to /dashboard
- ✅ Display: "Welcome back, John Doe!"

---

### Use Case 2: Female User Profile
**User:** Jane Smith
**Steps:**
1. Login with Jane's credentials
2. View dashboard

**Expected Result:**
- ✅ Display correct name: "Jane Smith"
- ✅ Display correct email
- ✅ Gender: Female

---

### Use Case 3: Password Validation
**User:** Create new test user

**Valid Password Examples:**
- `SecurePass123!` ✅
- `StrongPass456!` ✅
- `MyP@ssw0rd!` ✅
- `Test123!@#` ✅

**Invalid Password Examples:**
- `weak` ❌ (too short)
- `password` ❌ (no uppercase, number, special char)
- `PASSWORD123` ❌ (no lowercase, special char)
- `Password` ❌ (no number, special char)
- `Pass123` ❌ (too short, no special char)

---

### Use Case 4: Email Validation
**Valid Emails:**
- `john.doe.test@example.com` ✅
- `jane.smith.test@example.com` ✅
- `user@domain.com` ✅
- `test.user+tag@example.co.uk` ✅

**Invalid Emails:**
- `invalid-email` ❌
- `@example.com` ❌
- `user@` ❌
- `user domain.com` ❌

---

### Use Case 5: Age Validation
**Valid Dates of Birth (18+):**
- `1995-01-15` ✅ (30 years old)
- `1992-05-20` ✅ (33 years old)
- `2000-12-31` ✅ (24 years old)

**Invalid Dates (Under 18):**
- `2010-01-01` ❌ (15 years old)
- `2015-06-15` ❌ (10 years old)

---

## 📧 Email Verification

### Check Verification Emails

**Mailhog URL:** http://localhost:8025

**Steps:**
1. Open Mailhog in browser
2. Look for emails sent to test accounts
3. Should see 2 verification emails:
   - To: john.doe.test@example.com
   - To: jane.smith.test@example.com

**Email Details:**
- **Subject:** "Verify your Flamoral account"
- **From:** Flamoral
- **Contains:** Verification link with token
- **Expiry:** 24 hours

---

## 🔑 Quick Reference

### Quick Copy Credentials

**John Doe:**
```
Email: john.doe.test@example.com
Password: SecurePass123!
```

**Jane Smith:**
```
Email: jane.smith.test@example.com
Password: StrongPass456!
```

---

## 🗄️ Database Queries

### View All Test Users

```sql
SELECT
  id,
  email,
  first_name,
  last_name,
  gender,
  is_verified,
  is_email_verified,
  created_at
FROM users
WHERE email LIKE '%test@example.com'
ORDER BY created_at DESC;
```

**Run in Terminal:**
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "SELECT id, email, first_name, last_name, is_verified FROM users WHERE email LIKE '%test@example.com';"
```

---

### View Verification Tokens

```sql
SELECT
  user_id,
  type,
  is_used,
  expires_at,
  created_at
FROM verification_tokens
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%test@example.com'
)
ORDER BY created_at DESC;
```

**Run in Terminal:**
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "SELECT user_id, type, is_used, expires_at FROM verification_tokens ORDER BY created_at DESC LIMIT 5;"
```

---

### View User Profiles

```sql
SELECT
  p.user_id,
  u.email,
  u.first_name,
  u.last_name,
  p.bio,
  p.city,
  p.created_at
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE u.email LIKE '%test@example.com';
```

---

## 🧹 Cleanup Commands

### Delete Test Users

```sql
-- Delete all test accounts
DELETE FROM users WHERE email LIKE '%test@example.com';
```

**Run in Terminal:**
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "DELETE FROM users WHERE email LIKE '%test@example.com';"
```

**Note:** This will cascade delete:
- User profiles
- Verification tokens
- Refresh tokens
- Any other related data

---

### Reset Test Accounts

To recreate test accounts after deletion:

```bash
# User 1 - John Doe
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"john.doe.test@example.com","password":"SecurePass123!","first_name":"John","last_name":"Doe","date_of_birth":"1995-01-15","gender":"male","phone_number":"+1234567890"}'

# User 2 - Jane Smith
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"jane.smith.test@example.com","password":"StrongPass456!","first_name":"Jane","last_name":"Smith","date_of_birth":"1992-05-20","gender":"female","phone_number":"+1987654321"}'
```

---

## 🧪 Additional Test Scenarios

### Scenario: Duplicate Email Registration

**Steps:**
1. Try to register with `john.doe.test@example.com` again
2. Should get error: "User with this email already exists"

---

### Scenario: Invalid Login

**Test 1: Wrong Password**
- Email: `john.doe.test@example.com`
- Password: `WrongPassword123!`
- **Expected:** Error "Invalid credentials"

**Test 2: Non-existent Email**
- Email: `nonexistent@example.com`
- Password: `AnyPassword123!`
- **Expected:** Error "Invalid credentials"

---

### Scenario: Password Reset

**Steps:**
1. Go to Forgot Password page
2. Enter: `john.doe.test@example.com`
3. Check Mailhog for reset email
4. Verify email contains reset link

---

## 📊 Test Coverage

### Authentication Testing ✅

- [x] Register with John Doe credentials
- [x] Register with Jane Smith credentials
- [x] Login with valid credentials
- [x] Login with invalid password
- [x] Login with non-existent email
- [x] Duplicate email registration
- [x] Password strength validation
- [x] Email format validation
- [x] Age validation (18+)

### Email Testing ✅

- [x] Verification email sent for John
- [x] Verification email sent for Jane
- [x] Emails visible in Mailhog
- [x] Password reset email functionality

### Database Testing ✅

- [x] Users created in database
- [x] Profiles auto-created
- [x] Verification tokens generated
- [x] Data relationships maintained

---

## 🚨 Important Notes

### Security

⚠️ **These are TEST accounts only!**
- Do NOT use in production
- Passwords are publicly documented
- Accounts should be deleted before production deployment

### Email Verification

📧 **Verification Status:**
- Both accounts are **unverified**
- Verification emails sent to Mailhog
- To verify: Extract token from email and use `/api/auth/verify-email` endpoint

### Rate Limiting

⚡ **Login Attempts:**
- Maximum 5 attempts per 15 minutes
- If exceeded, wait 15 minutes or restart backend service

---

## 📞 Support

### If Accounts Don't Work

1. **Verify services are running:**
   ```bash
   # Backend
   curl http://localhost:3001/health

   # Frontend
   open http://localhost:3000
   ```

2. **Check database:**
   ```bash
   docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "SELECT COUNT(*) FROM users;"
   ```

3. **Recreate accounts:**
   - Delete existing test accounts
   - Run registration curl commands again

---

**Document Version:** 1.0.0
**Last Updated:** November 16, 2025
**Status:** ✅ Active Test Accounts
**Next Review:** Weekly during development
