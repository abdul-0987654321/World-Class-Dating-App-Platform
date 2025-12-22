# Quick Start Testing Guide

**Last Updated:** November 16, 2025
**Status:** ✅ Ready for Testing

---

## 🚀 Start Testing in 3 Steps

### Step 1: Ensure Services Are Running

```bash
# Backend should be running on port 3001
# Frontend should be running on port 3000
# Docker services should be up
```

**Check Status:**
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000
- Mailhog: http://localhost:8025
- API Docs: http://localhost:3001/api-docs

---

### Step 2: Use Pre-Created Test Accounts

#### 👤 Test Account #1 - John Doe ✅
```
Email:    john.doe.test@example.com
Password: SecurePass123!
User ID:  65d451f5-32d1-4059-a32e-fcab3eef1b3d
Status:   Email Verified
```

#### 👤 Test Account #2 - Jane Smith ✅
```
Email:    jane.smith.test@example.com
Password: StrongPass456!
User ID:  da5444a9-7eae-425e-9361-222553dc0750
Status:   Email Verified
```

---

### Step 3: Test the Application

#### Login Test (30 seconds)
1. Open http://localhost:3000/login
2. Enter John's email and password
3. Click "Login"
4. ✅ Should see dashboard with "Welcome back, John Doe!"

#### Dashboard Test (1 minute)
1. Verify user information cards display correctly
2. Check verification status badge (should show "Not Verified")
3. Click "Logout" button
4. ✅ Should redirect to login page

#### Registration Test (2 minutes)
1. Navigate to http://localhost:3000/register
2. Fill in NEW user details (different email)
3. Submit form
4. ✅ Should create account and show dashboard
5. Check Mailhog for verification email

---

## 📚 Detailed Documentation

### Full Testing Guides

1. **Frontend Testing Guide**
   - Location: `docs/guides/Frontend-Testing-Guide.md`
   - Content: 10 comprehensive test scenarios
   - Use: Complete frontend testing procedures

2. **E2E Testing Guide**
   - Location: `docs/guides/E2E-Testing-Guide.md`
   - Content: Backend API testing
   - Use: End-to-end workflow testing

3. **Test Accounts Reference**
   - Location: `docs/TEST-ACCOUNTS.md`
   - Content: Complete test user details, database queries
   - Use: Quick credential reference

4. **Performance Testing Guide**
   - Location: `docs/guides/Performance-Testing-Guide.md`
   - Content: Load testing, benchmarks
   - Use: Performance and stress testing

5. **Security Audit Report**
   - Location: `docs/SECURITY-AUDIT-REPORT.md`
   - Content: Security analysis, recommendations
   - Use: Security review

---

## ✅ Quick Test Checklist

### 5-Minute Smoke Test

- [ ] **Login with John Doe**
  - Email: john.doe.test@example.com
  - Password: SecurePass123!
  - ✅ Redirects to dashboard

- [ ] **View Dashboard**
  - ✅ User name displays: "John Doe"
  - ✅ Email displays correctly
  - ✅ Verification status shows

- [ ] **Logout**
  - ✅ Redirects to login page
  - ✅ LocalStorage cleared

- [ ] **Login with Jane Smith**
  - Email: jane.smith.test@example.com
  - Password: StrongPass456!
  - ✅ Successful login

- [ ] **Test Invalid Login**
  - Email: john.doe.test@example.com
  - Password: WrongPassword123!
  - ✅ Shows error: "Invalid credentials"

---

## 🧪 Test Scenarios by Priority

### P0 - Critical (Must Work)
1. ✅ User can login with valid credentials
2. ✅ User can register new account
3. ✅ Dashboard displays user information
4. ✅ Logout works correctly
5. ✅ Invalid credentials show error

### P1 - High Priority
6. ✅ Form validation works (email, password)
7. ✅ Forgot password sends email
8. ✅ Duplicate email registration rejected
9. ✅ Protected routes redirect when not authenticated
10. ✅ Responsive design on mobile

### P2 - Medium Priority
11. ✅ Loading states display correctly
12. ✅ Toast notifications appear
13. ✅ Navigation links work
14. ✅ Password strength validation
15. ✅ Age validation (18+)

---

## 🗄️ Database Quick Checks

### View Test Users
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "SELECT id, email, first_name, is_verified FROM users WHERE email LIKE '%test@example.com';"
```

**Expected Output:**
```
id                                   | email                         | first_name | is_verified
-------------------------------------+-------------------------------+------------+-------------
65d451f5-32d1-4059-a32e-fcab3eef1b3d | john.doe.test@example.com     | John       | f
da5444a9-7eae-425e-9361-222553dc0750 | jane.smith.test@example.com   | Jane       | f
```

### View Verification Emails
```bash
# Open Mailhog
open http://localhost:8025

# Or view in browser
```

**Expected:**
- 2 verification emails sent
- To: john.doe.test@example.com
- To: jane.smith.test@example.com

---

## 🐛 Common Issues & Solutions

### Issue: Can't Login

**Solution 1: Check Services**
```bash
# Backend health check
curl http://localhost:3001/health

# If not responding, restart backend
cd backend/services/user-service
npm run dev
```

**Solution 2: Check Rate Limiting**
- Max 5 login attempts per 15 minutes
- If exceeded, wait or restart backend

### Issue: User Not Found

**Solution: Verify Database**
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users -c "SELECT COUNT(*) FROM users;"

# Should show at least 2 users (test accounts)
```

### Issue: Frontend Not Loading

**Solution: Restart Frontend**
```bash
cd frontend/web
npm run dev
```

---

## 📊 Test Status Dashboard

| Feature | Status | Last Tested |
|---------|--------|-------------|
| User Registration | ✅ Working | 2025-11-16 |
| User Login | ✅ Working | 2025-11-16 |
| Dashboard | ✅ Working | 2025-11-16 |
| Logout | ✅ Working | 2025-11-16 |
| Forgot Password | ✅ Working | 2025-11-16 |
| Form Validation | ✅ Working | 2025-11-16 |
| Protected Routes | ✅ Working | 2025-11-16 |
| Email Sending | ✅ Working (Mailhog) | 2025-11-16 |
| Database Integration | ✅ Working | 2025-11-16 |
| API Connectivity | ✅ Working | 2025-11-16 |

---

## 🎯 Today's Test Focus

### Frontend Features to Test
1. **Login Flow** - Use John's credentials
2. **Registration** - Create new test user
3. **Dashboard** - View user information
4. **Form Validation** - Test error states
5. **Responsive Design** - Check mobile layout

### Backend Features to Test
1. **API Endpoints** - Test via Postman/curl
2. **Database** - Verify data persistence
3. **Email Sending** - Check Mailhog
4. **Token Management** - JWT validation
5. **Error Handling** - Invalid requests

---

## 📞 Need Help?

### Quick Commands

**Check Backend Logs:**
```bash
cd backend/services/user-service
npm run dev
# Watch for errors in output
```

**Check Frontend Logs:**
```bash
cd frontend/web
npm run dev
# Watch for errors in browser console
```

**Check Docker Services:**
```bash
docker-compose ps
# All services should be "Up"
```

**View Database:**
```bash
docker exec flamoral-postgres psql -U postgres -d flamoral_users
\dt  # List tables
\q   # Quit
```

---

## 🎓 Learning Resources

### For Testers
- Frontend Testing Guide: Comprehensive UI testing
- E2E Testing Guide: Full workflow testing
- Test Accounts: Pre-created user credentials

### For Developers
- API Documentation: http://localhost:3001/api-docs
- Security Audit: Security best practices
- Performance Guide: Load testing procedures

---

## ✨ Quick Wins

### Test These in 5 Minutes
1. ✅ Login with John → Dashboard → Logout
2. ✅ Login with Jane → Dashboard → Logout
3. ✅ Try invalid password → See error
4. ✅ Check Mailhog → See emails
5. ✅ View API docs → Explore endpoints

### Test These in 15 Minutes
1. ✅ Register new user
2. ✅ Test form validations
3. ✅ Forgot password flow
4. ✅ Check database entries
5. ✅ Test on mobile device
6. ✅ Test protected routes
7. ✅ Verify localStorage
8. ✅ Test logout functionality

---

## 🎉 Success Criteria

**Frontend is working if:**
- ✅ Can login with test accounts
- ✅ Can register new users
- ✅ Dashboard displays correctly
- ✅ Logout redirects to login
- ✅ Forms validate properly
- ✅ Errors show appropriately

**Backend is working if:**
- ✅ Health endpoint responds
- ✅ API calls return data
- ✅ Database stores users
- ✅ Emails sent to Mailhog
- ✅ Tokens are generated
- ✅ Authentication works

---

**Start Testing Now! 🚀**

Use John or Jane's credentials at http://localhost:3000/login and explore the platform!

---

**Document Version:** 1.0.0
**Created:** November 16, 2025
**Purpose:** Quick testing reference for all users
