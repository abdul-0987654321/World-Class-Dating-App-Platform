# Test Accounts

**Pre-configured accounts for testing ConnectSphere**

---

## 🔑 Account Credentials

### Standard User Account
**Email**: demo@connectsphere.com  
**Password**: Demo123!  
**Type**: Free tier user  
**Features**: Basic matching, 50 likes/day, messaging  

### Premium User Account
**Email**: premium@connectsphere.com  
**Password**: Premium123!  
**Type**: Premium subscriber  
**Features**: Unlimited likes, see who liked you, advanced filters, rewind

### Administrator Account
**Email**: admin@connectsphere.com  
**Password**: Admin123!  
**Type**: System administrator  
**Features**: Full admin dashboard access, user management, moderation

---

## 📱 Using Test Accounts

### On Mobile Apps
1. Open the app
2. Tap "Login"
3. Enter email and password
4. Tap "Sign In"

### On Web App
1. Visit http://localhost:5173 (dev) or https://connectsphere.com (prod)
2. Click "Login"
3. Enter credentials
4. Click "Sign In"

### Admin Dashboard
1. Visit http://localhost:5174 (dev) or https://admin.connectsphere.com (prod)
2. Login with admin credentials
3. Access admin features

---

## 🎭 Test Scenarios

### Testing Basic Flow (Standard User)
1. Login as demo@connectsphere.com
2. Complete profile setup
3. Start swiping (50 likes available)
4. Match with someone
5. Send messages

### Testing Premium Features (Premium User)
1. Login as premium@connectsphere.com
2. Access "See who liked you"
3. Use advanced filters
4. Unlimited likes
5. Rewind feature
6. Read receipts

### Testing Admin Features (Admin)
1. Login as admin@connectsphere.com
2. View user list
3. Review moderation queue
4. Check analytics
5. Manage subscriptions

---

## 🔒 Security Notes

- **Change passwords** in production
- **Never commit** actual credentials to Git
- **Use environment variables** for production accounts
- **Enable 2FA** for admin accounts in production

---

## 🆕 Creating New Test Accounts

### Via Seed Script
```bash
yarn seed
```

### Manually via API
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "dateOfBirth": "1995-01-01",
    "gender": "male"
  }'
```

---

## 📊 Test Data

Test accounts come with:
- Pre-filled profiles
- Sample photos (placeholder)
- Mock matches
- Sample conversations
- Activity history

---

**Last Updated**: November 23, 2025
